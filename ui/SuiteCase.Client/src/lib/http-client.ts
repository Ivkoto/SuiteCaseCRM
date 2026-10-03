export type ValidationErrors = Readonly<Record<string, readonly string[]>>;

export type ProblemDetails = Readonly<{
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  traceId?: string;
  existingCustomerId?: number;
  errors?: ValidationErrors;
}>;

export class HttpError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;

  constructor(status: number, problem: ProblemDetails) {
    super(problem.title ?? `Request failed with status ${status}.`);
    this.name = 'HttpError';
    this.status = status;
    this.problem = problem;
  }

  get code(): string | undefined {
    return this.problem.code;
  }

  getFieldErrors(fieldName: string): readonly string[] {
    return getValidationErrors(this.problem, fieldName);
  }
}

export class InvalidResponseError extends Error {
  readonly status: number;

  constructor(status: number) {
    super('The server returned an unexpected response.');
    this.name = 'InvalidResponseError';
    this.status = status;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type JsonRequestOptions<T> = Readonly<{
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
  expectedStatus?: number;
  validate: (value: unknown) => value is T;
}>;

type EmptyRequestOptions = Readonly<{
  method: HttpMethod;
  signal?: AbortSignal;
  expectedStatus?: number;
}>;

export async function requestJson<T>(
  path: string,
  options: JsonRequestOptions<T>,
): Promise<T> {
  const response = await sendRequest(path, options);

  if (options.expectedStatus !== undefined && response.status !== options.expectedStatus) {
    throw new InvalidResponseError(response.status);
  }

  if (!hasJsonContentType(response)) {
    throw new InvalidResponseError(response.status);
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new InvalidResponseError(response.status);
  }

  if (!options.validate(body)) {
    throw new InvalidResponseError(response.status);
  }

  return body;
}

export async function requestEmpty(
  path: string,
  options: EmptyRequestOptions,
): Promise<void> {
  const response = await sendRequest(path, options);

  if (options.expectedStatus !== undefined && response.status !== options.expectedStatus) {
    throw new InvalidResponseError(response.status);
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function getValidationErrors(
  errorOrProblem: HttpError | ProblemDetails | null | undefined,
  fieldName: string,
): readonly string[] {
  const problem = errorOrProblem instanceof HttpError
    ? errorOrProblem.problem
    : errorOrProblem;
  const errors = problem?.errors;

  if (errors === undefined) {
    return [];
  }

  const normalizedFieldName = fieldName.toLowerCase();
  const matchingKey = Object.keys(errors).find(
    (key) => key.toLowerCase() === normalizedFieldName,
  );

  return matchingKey === undefined ? [] : (errors[matchingKey] ?? []);
}

async function sendRequest(
  path: string,
  options: Omit<JsonRequestOptions<unknown>, 'validate'> | EmptyRequestOptions,
): Promise<Response> {
  const hasBody = 'body' in options && options.body !== undefined;
  const headers = new Headers({ Accept: 'application/json' });

  if (hasBody) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw await createHttpError(response);
  }

  return response;
}

async function createHttpError(response: Response): Promise<HttpError> {
  const parsedProblem = hasJsonContentType(response)
    ? await readProblemDetails(response)
    : null;
  const problem: ProblemDetails = {
    ...parsedProblem,
    status: response.status,
  };

  return new HttpError(response.status, problem);
}

async function readProblemDetails(response: Response): Promise<ProblemDetails | null> {
  let body: unknown;

  try {
    body = await response.json();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    // An HTTP failure with an invalid JSON body is still represented by HttpError.
    return null;
  }

  return parseProblemDetails(body);
}

function parseProblemDetails(value: unknown): ProblemDetails | null {
  if (!isRecord(value)) {
    return null;
  }

  const problem: {
    type?: string;
    title?: string;
    status?: number;
    detail?: string;
    instance?: string;
    code?: string;
    traceId?: string;
    existingCustomerId?: number;
    errors?: ValidationErrors;
  } = {};

  assignString(value, problem, 'type');
  assignString(value, problem, 'title');
  assignInteger(value, problem, 'status');
  assignString(value, problem, 'detail');
  assignString(value, problem, 'instance');
  assignString(value, problem, 'code');
  assignString(value, problem, 'traceId');
  assignInteger(value, problem, 'existingCustomerId');

  const errors = parseValidationErrors(value.errors);
  if (errors !== undefined) {
    problem.errors = errors;
  }

  return problem;
}

function parseValidationErrors(value: unknown): ValidationErrors | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const errors: Record<string, readonly string[]> = {};

  for (const [fieldName, messages] of Object.entries(value)) {
    if (!Array.isArray(messages) || !messages.every(isString)) {
      continue;
    }

    errors[fieldName] = messages;
  }

  return errors;
}

function assignString(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  propertyName: string,
): void {
  const value = source[propertyName];
  if (typeof value === 'string') {
    target[propertyName] = value;
  }
}

function assignInteger(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  propertyName: string,
): void {
  const value = source[propertyName];
  if (Number.isInteger(value)) {
    target[propertyName] = value;
  }
}

function hasJsonContentType(response: Response): boolean {
  const contentType = response.headers.get('content-type');
  if (contentType === null) {
    return false;
  }

  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType === 'application/json' || mediaType?.endsWith('+json') === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === 'AbortError';
}
