import { expect, test } from '@playwright/test'

const emptyCustomerPage = {
  items: [],
  page: 1,
  pageSize: 13,
  totalCount: 0,
  totalPages: 0,
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/customers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyCustomerPage),
    })
  })

  await page.goto('/customers')
  await expect(page.getByText('No customers yet')).toBeVisible()
})

test('the blank dashboard navigates to Customers and supports browser history', async ({ page }) => {
  const customerRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/customers')) {
      customerRequests.push(request.url())
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page.getByRole('main')).toBeEmpty()
  expect(customerRequests).toHaveLength(0)

  const customersLink = page.getByRole('link', { name: 'Customers', exact: true })
  await expect(customersLink).not.toHaveAttribute('aria-current')
  await customersLink.click()

  await expect(page).toHaveURL(/\/customers$/)
  await expect(page.getByText('No customers yet')).toBeVisible()
  await expect(customersLink).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('main')).toBeFocused()

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page.getByRole('main')).toBeEmpty()

  await page.goForward()
  await expect(page).toHaveURL(/\/customers$/)
  await expect(page.getByText('No customers yet')).toBeVisible()
})

test('planned section URLs remain blank without enabling navigation or requesting customers', async ({ page }) => {
  const customerRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/customers')) {
      customerRequests.push(request.url())
    }
  })

  const plannedSections = [
    { path: '/programs', title: 'Programs & Groups' },
    { path: '/bookings', title: 'Bookings' },
    { path: '/documents', title: 'Documents' },
    { path: '/payments', title: 'Payments' },
    { path: '/administration', title: 'Administration' },
  ]

  for (const { path, title } of plannedSections) {
    await page.goto(path)

    await expect(page).toHaveURL((url) => url.pathname === path)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.getByRole('main')).toBeEmpty()

    const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
    const plannedNavigationItem = navigation.locator('[aria-disabled="true"]').filter({
      has: page.getByText(title, { exact: true }),
    })
    await expect(plannedNavigationItem).toContainText('Soon')
    await expect(navigation.getByRole('link', { name: title, exact: true })).toHaveCount(0)
  }

  expect(customerRequests).toHaveLength(0)
})

test('the customer dialog traps focus and returns it to its trigger', async ({ page }) => {
  const addCustomerButton = page.getByRole('button', { name: 'Add New Customer' })
  await addCustomerButton.click()

  const dialog = page.getByRole('dialog', { name: 'Add new customer' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('textbox', { name: /First name/ })).toBeFocused()

  const surfaceBox = await dialog.locator('.customer-dialog-surface').boundingBox()
  const viewport = page.viewportSize()
  if (surfaceBox === null || viewport === null) {
    throw new Error('The dialog layout could not be measured.')
  }
  expect(surfaceBox.x).toBeGreaterThanOrEqual(0)
  expect(surfaceBox.y).toBeGreaterThanOrEqual(0)
  expect(surfaceBox.x + surfaceBox.width).toBeLessThanOrEqual(viewport.width)
  expect(surfaceBox.y + surfaceBox.height).toBeLessThanOrEqual(viewport.height)

  for (let pressCount = 0; pressCount < 16; pressCount += 1) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(addCustomerButton).toBeFocused()
})

test('the desktop sidebar collapses and expands', async ({ page }) => {
  const shell = page.locator('.app-shell')
  const sidebar = page.locator('#primary-sidebar')

  await expect(page.getByRole('button', { name: 'Collapse navigation' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect((await sidebar.boundingBox())?.width).toBeGreaterThan(200)

  await page.getByRole('button', { name: 'Collapse navigation' }).click()
  await expect(shell).toHaveClass(/app-shell--collapsed/)
  await expect(page.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(page.locator('.app-nav-label').first()).toBeHidden()
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBeLessThan(100)

  await page.getByRole('button', { name: 'Expand navigation' }).click()
  await expect(shell).not.toHaveClass(/app-shell--collapsed/)
  await expect(page.locator('.app-nav-label').first()).toBeVisible()
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBeGreaterThan(200)
})

test('light and dark themes apply and the selection persists', async ({ page }) => {
  const root = page.locator('html')

  await expect(root).toHaveAttribute('data-theme', 'light')
  await expect(root).toHaveCSS('color-scheme', 'light')

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(root).toHaveAttribute('data-theme', 'dark')
  await expect(root).toHaveCSS('color-scheme', 'dark')
  expect(await page.evaluate(() => localStorage.getItem('suitecase-theme'))).toBe('dark')

  await page.reload()
  await expect(page.getByText('No customers yet')).toBeVisible()
  await expect(root).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(root).toHaveAttribute('data-theme', 'light')
  await expect(root).toHaveCSS('color-scheme', 'light')
})
