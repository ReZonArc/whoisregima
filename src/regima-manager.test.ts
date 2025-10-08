import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { promises as fs } from 'node:fs'
import { RegimaManager } from './regima-manager.ts'

test('RegimaManager basic functionality', async (t) => {
	const testFile = 'test-regima-domains.json'
	const manager = new RegimaManager(testFile)

	// Cleanup test file
	const cleanup = async () => {
		try {
			await fs.unlink(testFile)
		} catch (error) {
			// File doesn't exist, that's ok
		}
	}

	await cleanup()

	await t.test('should start with empty domains list', async () => {
		await manager.loadDomains()
		const domains = manager.getDomains()
		assert.equal(domains.length, 0)
	})

	await t.test('should get basic stats for empty list', async () => {
		const stats = manager.getStats()
		assert.equal(stats.totalDomains, 0)
		assert.deepEqual(stats.byRegistrar, {})
		assert.deepEqual(stats.byTld, {})
		assert.deepEqual(stats.byStatus, {})
	})

	await t.test('should handle grouping for empty list', async () => {
		const grouped = manager.groupDomains({ groupBy: 'registrar' })
		assert.deepEqual(grouped, {})
	})

	await t.test('should remove non-existent domain', async () => {
		const result = await manager.removeDomain('nonexistent.com')
		assert.equal(result, false)
	})

	// Cleanup after tests
	await cleanup()
})

test('RegimaManager grouping functionality', async (t) => {
	// Mock domain entries for testing grouping
	const mockDomains = [
		{
			domain: 'example.com',
			addedDate: '2024-01-15T00:00:00.000Z',
			lastUpdated: '2024-01-15T00:00:00.000Z',
			whoisData: {
				'Domain Name': 'EXAMPLE.COM',
				'Registrar': 'Example Registrar',
				'Created Date': '2000-01-01T00:00:00.000Z',
				'Expiry Date': '2025-01-01T00:00:00.000Z',
				'Domain Status': ['clientTransferProhibited'],
				'Name Server': ['ns1.example.com', 'ns2.example.com']
			},
			metadata: { tags: ['test'], priority: 'high' as const }
		},
		{
			domain: 'test.org',
			addedDate: '2024-01-16T00:00:00.000Z',
			lastUpdated: '2024-01-16T00:00:00.000Z',
			whoisData: {
				'Domain Name': 'TEST.ORG',
				'Registrar': 'Another Registrar',
				'Created Date': '2001-06-01T00:00:00.000Z',
				'Expiry Date': '2025-06-01T00:00:00.000Z',
				'Domain Status': ['ok'],
				'Name Server': ['ns1.test.org']
			},
			metadata: { tags: ['test'], priority: 'medium' as const }
		}
	]

	const testFile = 'test-regima-grouping.json'
	const manager = new RegimaManager(testFile)
	
	// Manually set domains for testing (bypassing WHOIS calls)
	manager['domains'] = mockDomains

	const cleanup = async () => {
		try {
			await fs.unlink(testFile)
		} catch (error) {
			// File doesn't exist, that's ok
		}
	}

	await cleanup()

	await t.test('should group by registrar', async () => {
		const grouped = manager.groupDomains({ groupBy: 'registrar' })
		assert.equal(Object.keys(grouped).length, 2)
		assert.equal(grouped['Example Registrar'].length, 1)
		assert.equal(grouped['Another Registrar'].length, 1)
		assert.equal(grouped['Example Registrar'][0].domain, 'example.com')
		assert.equal(grouped['Another Registrar'][0].domain, 'test.org')
	})

	await t.test('should group by TLD', async () => {
		const grouped = manager.groupDomains({ groupBy: 'tld' })
		assert.equal(Object.keys(grouped).length, 2)
		assert.equal(grouped['COM'].length, 1)
		assert.equal(grouped['ORG'].length, 1)
		assert.equal(grouped['COM'][0].domain, 'example.com')
		assert.equal(grouped['ORG'][0].domain, 'test.org')
	})

	await t.test('should group by creation year', async () => {
		const grouped = manager.groupDomains({ groupBy: 'createdYear' })
		assert.equal(Object.keys(grouped).length, 2)
		assert.equal(grouped['2000'].length, 1)
		assert.equal(grouped['2001'].length, 1)
		assert.equal(grouped['2000'][0].domain, 'example.com')
		assert.equal(grouped['2001'][0].domain, 'test.org')
	})

	await t.test('should group by creation month', async () => {
		const grouped = manager.groupDomains({ groupBy: 'createdMonth' })
		assert.equal(Object.keys(grouped).length, 2)
		assert.equal(grouped['2000-01'].length, 1)
		assert.equal(grouped['2001-06'].length, 1)
	})

	await t.test('should get correct stats', async () => {
		const stats = manager.getStats()
		assert.equal(stats.totalDomains, 2)
		assert.equal(stats.byRegistrar['Example Registrar'], 1)
		assert.equal(stats.byRegistrar['Another Registrar'], 1)
		assert.equal(stats.byTld['COM'], 1)
		assert.equal(stats.byTld['ORG'], 1)
	})

	// Cleanup after tests
	await cleanup()
})