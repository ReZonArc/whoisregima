#!/usr/bin/env node
/**
 * Simple CLI tool for managing regima domains
 * Usage: node regima-cli.js [command] [options]
 */

import { RegimaManager } from '../src/regima-manager.ts'

const args = process.argv.slice(2)
const command = args[0]
const dataFile = 'regima-domains.json'

async function showHelp() {
	console.log(`
Regima Domain Manager CLI

Usage: node regima-cli.js [command] [options]

Commands:
  add <domain>     Add a domain to the regima list
  remove <domain>  Remove a domain from the regima list
  list             Show all tracked domains
  stats            Show domain statistics
  group <metric>   Group domains by metric (registrar, tld, createdYear, etc.)
  update           Update WHOIS data for all domains
  help             Show this help message

Examples:
  node regima-cli.js add example.com
  node regima-cli.js group registrar
  node regima-cli.js stats
`)
}

async function main() {
	const manager = new RegimaManager(dataFile)
	await manager.loadDomains()

	switch (command) {
		case 'add':
			if (!args[1]) {
				console.error('Error: Please specify a domain to add')
				process.exit(1)
			}
			console.log(`Adding ${args[1]}...`)
			try {
				const entry = await manager.addDomain(args[1], {
					tags: ['regima', 'cli-added'],
					priority: 'medium'
				})
				console.log(`✅ Added ${args[1]} (Registrar: ${entry.whoisData['Registrar'] || 'Unknown'})`)
			} catch (error) {
				console.error(`❌ Failed to add ${args[1]}:`, error)
			}
			break

		case 'remove':
			if (!args[1]) {
				console.error('Error: Please specify a domain to remove')
				process.exit(1)
			}
			const removed = await manager.removeDomain(args[1])
			if (removed) {
				console.log(`✅ Removed ${args[1]}`)
			} else {
				console.log(`❌ Domain ${args[1]} not found`)
			}
			break

		case 'list':
			const domains = manager.getDomains()
			if (domains.length === 0) {
				console.log('No domains tracked')
			} else {
				console.log(`\nTracked Domains (${domains.length}):`)
				console.log('================')
				domains.forEach((domain, index) => {
					console.log(`${index + 1}. ${domain.domain}`)
					console.log(`   Registrar: ${domain.whoisData['Registrar'] || 'Unknown'}`)
					console.log(`   Created: ${domain.whoisData['Created Date'] || 'Unknown'}`)
					console.log(`   Expires: ${domain.whoisData['Expiry Date'] || 'Unknown'}`)
					console.log(`   Tags: ${domain.metadata?.tags?.join(', ') || 'None'}`)
					console.log()
				})
			}
			break

		case 'stats':
			const stats = manager.getStats()
			console.log('\nDomain Statistics:')
			console.log('==================')
			console.log(`Total domains: ${stats.totalDomains}`)
			
			if (Object.keys(stats.byRegistrar).length > 0) {
				console.log('\nBy Registrar:')
				Object.entries(stats.byRegistrar)
					.sort(([,a], [,b]) => b - a)
					.forEach(([registrar, count]) => {
						console.log(`  ${registrar}: ${count}`)
					})
			}

			if (Object.keys(stats.byTld).length > 0) {
				console.log('\nBy TLD:')
				Object.entries(stats.byTld)
					.sort(([,a], [,b]) => b - a)
					.forEach(([tld, count]) => {
						console.log(`  .${tld.toLowerCase()}: ${count}`)
					})
			}

			if (stats.oldestDomain) {
				console.log(`\nOldest domain: ${stats.oldestDomain.domain} (added ${new Date(stats.oldestDomain.addedDate).toLocaleDateString()})`)
			}
			if (stats.newestDomain) {
				console.log(`Newest domain: ${stats.newestDomain.domain} (added ${new Date(stats.newestDomain.addedDate).toLocaleDateString()})`)
			}
			break

		case 'group':
			const metric = args[1]
			if (!metric) {
				console.error('Error: Please specify a grouping metric (registrar, tld, createdYear, createdMonth, nameservers, status)')
				process.exit(1)
			}

			const validMetrics = ['registrar', 'tld', 'createdYear', 'createdMonth', 'expiryYear', 'expiryMonth', 'nameservers', 'status']
			if (!validMetrics.includes(metric)) {
				console.error(`Error: Invalid metric. Valid options: ${validMetrics.join(', ')}`)
				process.exit(1)
			}

			const grouped = manager.groupDomains({ groupBy: metric as any })
			console.log(`\nDomains grouped by ${metric}:`)
			console.log('='.repeat(30))
			
			if (Object.keys(grouped).length === 0) {
				console.log('No domains to group')
			} else {
				Object.entries(grouped).forEach(([key, domains]) => {
					console.log(`\n${key} (${domains.length} domains):`)
					domains.forEach(domain => {
						console.log(`  - ${domain.domain}`)
					})
				})
			}
			break

		case 'update':
			console.log('Updating WHOIS data for all domains...')
			try {
				await manager.updateAllDomains({ timeout: 5000 })
				console.log('✅ Update completed!')
			} catch (error) {
				console.error('❌ Update failed:', error)
			}
			break

		case 'help':
		case undefined:
			await showHelp()
			break

		default:
			console.error(`Unknown command: ${command}`)
			await showHelp()
			process.exit(1)
	}
}

main().catch(console.error)