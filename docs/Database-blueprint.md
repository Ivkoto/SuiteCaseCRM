# SuiteCase Database Architecture Blueprint

This document describes the current Phase 1 database architecture for SuiteCase.
EF Core entities, configurations, and migrations are implemented for the model below. Customer API workflows and Customer audit writes are implemented; travel-domain API workflows are not implemented yet.

## Core Principles

- SuiteCase starts as a single-agency CRM.
- SQL Server is the primary database.
- EF Core migrations are the schema source of truth.
- Do not use startup `MigrateAsync()` as the staging/production migration strategy.
- Main operational tables use soft delete with `DeletedAt`.
- Money is represented as a decimal amount plus currency.
- Customer-sensitive values are never stored as raw plaintext.
- Booking-related tables are historical snapshots. They may keep IDs for lookup, reporting, UI, and audit, but copied snapshot values are the historical truth.
- The travel operating model is `TravelProgram + Group`, not `Departure`.
- Travel product entity/table names use `TravelProgram*`. Some FK and snapshot property names still use `ProgramId`, `ProgramOptionId`, `ProgramPricingRuleId`, and `ProgramName` for now.

## Implementation Status

| Area | Status |
|---|---|
| Customer schema and migrations | Implemented |
| Travel Programs, Groups, Bookings, Payments, Loyalty schema | Implemented |
| Customer API | Implemented |
| Travel-domain APIs and business workflows | Not implemented |
| AuditEvents and Customer audit writes | Implemented |
| Customer document metadata | Not implemented; separate feature planned |

## High-Level Model

```text
Customer
  -> CustomerDocument (planned)
  -> Booking
       -> BookingOption
       -> BookingOptionalActivity
       -> BookingItem
       -> BookingTravelLeg
       -> Payment

TravelProgram
  -> TravelProgramOption
  -> Group
       -> GroupOption
       -> GroupOptionalActivity
       -> PaymentMilestone
  -> TravelProgramPricingRule

LoyaltyDiscountRule
  -> LoyaltyDiscountRuleDestination

AuditEvent (cross-cutting, no FK to audited records)
```

## AuditEvent

`AuditEvent` stores append-only records of security-relevant and business-significant actions.

Fields:

```text
Id
OperationId
Action
EntityType
EntityId
ActorId nullable
CorrelationId nullable
Details nullable
OccurredAt
```

Rules:

- `Action`, `EntityType`, and `EntityId` are required stable strings.
- `OperationId` is a required unique UUIDv7 transaction marker used for ambiguous-commit verification.
- `OccurredAt` is a required UTC `DateTimeOffset`.
- `ActorId` remains null until authentication supplies a stable staff identifier.
- Audit rows never store raw, encrypted, or hashed sensitive identifiers.
- Audit rows have no foreign keys to audited records so history survives record lifecycle changes.
- Database-level append-only permissions and retention policy are pending production decisions.

Indexes:

```text
(EntityType, EntityId, OccurredAt)
OccurredAt
Action
ActorId
CorrelationId
OperationId unique
```

## SQL Connection Resilience

- SQL Server is configured with `EnableRetryOnFailure` so EF Core retries recognized transient database and network failures.
- A single query or `SaveChangesAsync` call is handled as one retriable operation by the configured execution strategy.
- Code that manually groups multiple database operations must execute the complete transaction through `DbContext.Database.CreateExecutionStrategy()`.
- Current audited writes use `AuditTransaction`; its unique audit `OperationId` verifies whether an ambiguous commit actually succeeded.
- The audit `OperationId` covers retries inside one server operation, not replay of a separately submitted HTTP request.
- SQL transactions must not remain open across pCloud or other external service calls. Such workflows require an outbox/background process.

## Customer

`Customer` stores the CRM client/traveler profile.

Fields:

```text
Id
FirstName
MiddleName
LastName
FirstNameLatin
MiddleNameLatin
LastNameLatin
NationalIdEncrypted
NationalIdHash
DateOfBirth
PassportNumberEncrypted
PassportNumberHash
PassportExpiresOn
Email
PhoneNumber
ResidenceCountryCode
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- `Id` is currently `int`.
- `FirstName` and `LastName` are required.
- `FirstNameLatin` remains nullable.
- `Notes` is free text for staff comments/characteristics.
- `ResidenceCountryCode` is a required ISO alpha-2 code with database default `BG`.
- `CreatedAt`, `UpdatedAt`, and `DeletedAt` use `DateTimeOffset`.
- `NationalIdEncrypted` and `PassportNumberEncrypted` store reversible protected values.
- `NationalIdHash` and `PassportNumberHash` store normalized HMAC hashes for duplicate checks.
- Raw national ID and passport number are not stored.
- Soft-deleted customers are hidden by the global query filter.
- Active-row uniqueness is enforced with filtered unique indexes:

```text
NationalIdHash IS NOT NULL AND DeletedAt IS NULL
PassportNumberHash IS NOT NULL AND DeletedAt IS NULL
```

Calculated/UI-only values:

```text
Age
Passport validity
Total trips
Past trips
Upcoming trips
Applicable discount
```

These are not stored on `Customer`.

### Customer data decisions

- Supported residence countries are commonly recognized European countries; microstates are excluded for now. The maintained list is in [Countries.cs](../src/SuiteCase.Core/Countries/Countries.cs).
- A supplied date of birth is authoritative because `NationalId` can contain an untyped foreign identifier. Only when it is missing may an EGN-compatible value supply the date after structural and checksum validation. Passing that validation does not prove the identifier's issuing scheme.
- Age is calculated at response time. Passport validity requires expiry on or after six months from the reference date.
- Customer search supports partial name and phone matches, but National ID and passport lookup use exact normalized HMAC matches, never partial sensitive-identifier searches.

### Sensitive identifier protection

- Normalize identifiers with `Trim().ToUpperInvariant()` before protection or hashing; blank values become `null`. `Protect` and `Hash` expect normalized input.
- Use ASP.NET Core Data Protection for reversible display/export and HMAC-SHA256 for exact lookup and active-row uniqueness.
- Keep `Security:SensitiveDataHashKey` stable after real data exists. Changing it breaks lookup and duplicate detection against existing hashes.
- Persist and back up the Data Protection key ring before production, as required by [authentication setup](Authentication.md#browser-authentication).
- Soft delete allows another active customer to reuse an identifier. Clearing an identifier on update clears both its protected value and hash.

## CustomerDocument (Planned)

Customer documents will be modeled as a separate entity and feature. Do not add document fields directly to `Customer`.

SQL Server will store document metadata and the external provider identifier. File contents remain in the configured storage provider.

Expected metadata categories:

- customer id
- provider file id
- original file name
- content type and size
- document category
- upload timestamp and actor
- soft-delete status

Do not store a permanent public file URL. Access links must be generated on demand by the backend.

## TravelProgram

`TravelProgram` is the base travel product.

Fields:

```text
Id
Name
BaseStartDate
BaseEndDate
BasePriceAmount
BasePriceCurrency
OrganizerName
Description
Notes
IsActive
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- `TravelProgram` owns the base product identity.
- `BasePriceAmount` is the agency-defined base price.
- Concrete group prices may differ by season, flights, hotels, or options.
- `TravelProgram` is not the operational departure; that is `Group`.

## TravelProgramOption

`TravelProgramOption` is the catalog of selectable variant options available for a travel program.

Examples:

```text
Ban Giok
Cambodia
Ushuaia
Sahara
Atlas
```

Fields:

```text
Id
ProgramId
Name
Description
Notes
IsActive
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- This table describes available travel-program variants.
- It does not store the group-specific price.
- Group-specific inclusion and price are stored in `GroupOption`.
- The FK column is currently named `ProgramId`.
- Active option names are unique per program: `(ProgramId, Name)`.

## Group

`Group` is the operational departure/group level.

Fields:

```text
Id
ProgramId
ParentGroupId
Name
StartDate
EndDate
DepartureLocation
ReturnLocation
CapacityMode
Capacity
CustomerContactName
GuideName
TicketType
Description
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- `ParentGroupId = null` means the group is standalone or a master group.
- `ParentGroupId != null` means the group is a child/subgroup.
- A child group must belong to the same `ProgramId` as its parent.
- Same-program parent integrity is enforced by composite FK:

```text
child Group { ParentGroupId, ProgramId }
    -> parent Group { Id, ProgramId }
```

- `CapacityMode = PerGroup` means capacity is checked for that group only.
- `CapacityMode = SharedAcrossChildren` means capacity is checked across the master group and its children.

Example: Vietnam master group with child variants:

```text
G_MASTER_VN   ParentGroupId = null          CapacityMode = SharedAcrossChildren
G_VN_ONLY     ParentGroupId = G_MASTER_VN
G_VN_BANJOK   ParentGroupId = G_MASTER_VN
G_VN_CAMB     ParentGroupId = G_MASTER_VN
G_VN_BJ_CAMB  ParentGroupId = G_MASTER_VN
```

Example: independent Japan groups:

```text
G_JP_1 ParentGroupId = null CapacityMode = PerGroup
G_JP_2 ParentGroupId = null CapacityMode = PerGroup
G_JP_3 ParentGroupId = null CapacityMode = PerGroup
```

## GroupOption

`GroupOption` maps a `TravelProgramOption` to a concrete group/subgroup with its group-specific price.

Fields:

```text
Id
GroupId
ProgramOptionId
PriceAmount
PriceCurrency
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- Defines which travel-program options are included in a concrete group/subgroup.
- Adds to the group's display price.
- Unique active option per group:

```text
Unique(GroupId, ProgramOptionId)
```

Example:

```text
TravelProgram: Vietnam with Ban Giok and Cambodia
Base variant: Vietnam only
GroupOption: Ban Giok +255 EUR
GroupOption: Cambodia +358 EUR
```

## GroupOptionalActivity

`GroupOptionalActivity` stores optional activities available for travelers in a group.

Examples:

```text
Mini trekking - 320 EUR
Penguins - 180 EUR
Train - 70 EUR
Three Towers - 80 EUR
```

Fields:

```text
Id
GroupId
Name
Description
PriceAmount
Currency
IsActive
SortOrder
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- Optional activities are currently modeled at main/master group level.
- Active activity names are unique per group: `(GroupId, Name)`.
- When the UI is opened on a child group, optional activities are loaded from:

```text
selectedGroup.ParentGroupId ?? selectedGroup.Id
```

- Optional activities should appear as dynamic columns in the `Travelers in Selected Group` table.

## TravelProgramPricingRule

`TravelProgramPricingRule` stores charge/discount suggestions that can be applied to a booking.

Examples:

```text
Single Room Supplement
No Flight Discount
Estimated Insurance
```

Fields:

```text
Id
ProgramId
GroupId nullable
Kind
Name
PriceAmount
PriceCurrency
AppliesTo
IsOptional
AgeMin
AgeMax
IsDefaultSuggestion
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- `GroupId = null` means the rule is general for the travel program.
- `GroupId != null` scopes or overrides the rule for a specific group.
- `Kind` is `Discount` or `Charge`.
- `BookingItem` stores the booking snapshot when a rule is applied or manually adjusted.
- The rule is a suggestion/template, not historical truth.

## Booking

`Booking` is the actual reservation snapshot.

Fields:

```text
Id
CustomerId
ProgramId
GroupId
BookedOn
Status
ProgramName
GroupName
StartDate
EndDate
BasePriceAmount
TotalDiscountAmount
FinalPriceAmount
Currency
AppliedLoyaltyRuleId
AppliedLoyaltyRuleName
AppliedLoyaltyDiscountAmount
TicketSentStatus
ContractStatus
AnnexStatus
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- Booking stores both `ProgramId` and `GroupId` for lookup, reporting, UI, and audit.
- Snapshot fields such as `ProgramName`, `GroupName`, dates, prices, and discounts are the historical truth.
- `Booking.ProgramId` must match the `ProgramId` of `Booking.GroupId`.
- Booking group/program integrity is enforced by composite FK:

```text
Booking { GroupId, ProgramId }
    -> Group { Id, ProgramId }
```

- There is no separate direct FK from `Booking.ProgramId` to `TravelProgram.Id`; integrity is enforced through the selected group.

Statuses:

```text
Reserved
PartiallyPaid
Paid
Cancelled
```

Ticket statuses:

```text
NotSent
Sent
NotApplicable
```

Contract and annex statuses:

```text
NotSent
Sent
Signed
```

Pricing formula:

```text
FinalPriceAmount =
    BasePriceAmount
    + Sum(BookingOption.PriceAmount)
    + Sum(BookingOptionalActivity.PriceAmount * Quantity)
    + Sum(BookingItem where Kind = Charge and IsIncludedInTotal = true)
    - Sum(BookingItem where Kind = Discount and IsIncludedInTotal = true)
```

## BookingOption

`BookingOption` stores selected/included travel-program options as frozen booking rows.

Fields:

```text
Id
BookingId
ProgramOptionId
OptionName
PriceAmount
Currency
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- This is a snapshot row.
- Option name and price are copied at booking time.
- Unique option per booking:

```text
Unique(BookingId, ProgramOptionId)
```

## BookingOptionalActivity

`BookingOptionalActivity` stores selected optional activities as frozen booking rows.

Fields:

```text
Id
BookingId
GroupOptionalActivityId
Name
PriceAmount
Currency
Quantity
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- This is a snapshot row.
- Activity name and price are copied at booking time.
- `Quantity` supports more than one participant/unit if needed.
- Active selections are unique per booking and source activity: `(BookingId, GroupOptionalActivityId)`.

## BookingItem

`BookingItem` stores booking-level charges, discounts, and manual financial adjustments.

Examples:

```text
Single room supplement
Insurance
No flight discount
Extra flight charge
Manual adjustment
```

Fields:

```text
Id
BookingId
ProgramPricingRuleId nullable
Type
Description
Kind
Amount
Currency
IsIncludedInTotal
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- `Kind` is `Charge` or `Discount`.
- `Amount` is always positive.
- `Kind` determines whether the amount adds or subtracts.
- `Type` is not an enum. It comes from `TravelProgramPricingRule.Name` or manual staff entry.
- `ProgramPricingRuleId` is nullable so manual adjustments are supported.
- `IsIncludedInTotal = false` means informational/tracked but not part of `FinalPriceAmount`.

## BookingTravelLeg

`BookingTravelLeg` stores customer-specific travel leg changes.

Fields:

```text
Id
BookingId
Direction
Location
TravelDateTime
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Directions:

```text
Outbound
Return
```

Only one active leg per direction is allowed for a booking: `(BookingId, Direction)`.

## PaymentMilestone

`PaymentMilestone` stores the expected payment plan for a group.

Fields:

```text
Id
GroupId
Sequence
Name
DueBy
Amount
Currency
IsActive
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- This is the payment plan, not actual money movement.
- `Sequence` stores payment order independently of dates.
- Unique milestone sequence per group:

```text
Unique(GroupId, Sequence)
```

- If a customer pays all at once, one `Payment` row is created.
- Milestone fulfillment is calculated from the sum of payments.
- Personal milestone exceptions are out of scope for now. If needed later, add a booking-level override table.

## Payment

`Payment` stores actual money movement.

Fields:

```text
Id
BookingId
Direction
Amount
Currency
PaidOn
PaymentMethod
ExternalReference
Notes
CreatedAt
UpdatedAt
DeletedAt
CreatedBy
ChangedAt
ChangedBy
Reason
```

Rules:

- `Direction` is `Payment` or `Refund`.
- `Amount` is always positive.
- `PaymentMethod` defaults to `Bank`.
- `PaymentSource` is intentionally not used.
- Accounting/import references can be stored in `ExternalReference`.

Payment methods:

```text
Bank
Cash
Card
```

Paid amount:

```text
PaidAmount =
    Sum(Payment.Amount where Direction = Payment)
    - Sum(Payment.Amount where Direction = Refund)
```

Remaining amount:

```text
RemainingAmount = Booking.FinalPriceAmount - PaidAmount
```

## LoyaltyDiscountRule

`LoyaltyDiscountRule` stores automatic discount rules based on completed trips and optional program/destination criteria.

Fields:

```text
Id
Name
EffectiveFrom
EffectiveTo nullable
TripCountFrom
TripCountTo nullable
ProgramPriceMinAmount nullable
ProgramPriceMaxAmount nullable
DiscountAmount
Currency
Priority
DestinationMode
Notes
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- Rules can be globally applicable or scoped by destinations through `LoyaltyDiscountRuleDestination`.
- `Priority` determines ordering when multiple rules could apply.
- The applied loyalty result is snapshotted on `Booking`.

## LoyaltyDiscountRuleDestination

`LoyaltyDiscountRuleDestination` stores destination/program-scope rows for loyalty discount rules.

Fields:

```text
Id
RuleId
LoyaltyScopeKey
CreatedAt
UpdatedAt
DeletedAt
```

Rules:

- Unique destination/scope key per rule:

```text
Unique(RuleId, LoyaltyScopeKey)
```

## Enums

Current enum baseline:

```text
BookingStatus: Reserved, PartiallyPaid, Paid, Cancelled
PaymentDirection: Payment, Refund
PaymentMethod: Bank, Cash, Card
TicketSentStatus: NotSent, Sent, NotApplicable
TicketType: Group, Individual
ContractStatus: NotSent, Sent, Signed
AnnexStatus: NotSent, Sent, Signed
BookingItemKind: Discount, Charge
CapacityMode: PerGroup, SharedAcrossChildren
TravelLegDirection: Outbound, Return
LoyaltyDestinationMode: Any, Included, Excluded
Currency: Unknown, EUR, USD, GBP
ParticipantType: Unknown, Adult, Child, Infant
```

Notes:

- `GroupStatus` is intentionally not modeled yet because values are not confirmed.
- `PaymentSource` is intentionally excluded.
- `BookingItemType` is intentionally not an enum.

## Current Integrity Constraints

Core constraints currently configured in the database:

```text
Customer:
  unique active NationalIdHash
  unique active PassportNumberHash

TravelProgramOption:
  unique active (ProgramId, Name)

Group:
  child { ParentGroupId, ProgramId } -> parent { Id, ProgramId }

Booking:
  { GroupId, ProgramId } -> Group { Id, ProgramId }

GroupOption:
  unique active (GroupId, ProgramOptionId)

GroupOptionalActivity:
  unique active (GroupId, Name)

PaymentMilestone:
  unique active (GroupId, Sequence)

BookingOption:
  unique active (BookingId, ProgramOptionId)

BookingOptionalActivity:
  unique active (BookingId, GroupOptionalActivityId)

BookingTravelLeg:
  unique active (BookingId, Direction)

LoyaltyDiscountRuleDestination:
  unique active (RuleId, LoyaltyScopeKey)
```
