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

  await page.goto('/')
  await expect(page.getByText('No customers yet')).toBeVisible()
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
