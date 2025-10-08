import { RegimaManager } from '../src/regima-manager.ts'

async function demonstrateRegimaManager() {
	// Create a new regima manager instance
	const manager = new RegimaManager('regima-domains-example.json')
	
	// Load existing domains (if any)
	await manager.loadDomains()
	
	console.log('🏁 Starting Regima Domain Manager Demo')
	console.log('=====================================\n')

	// Sample regima-related domains to track
	const regimaDomains = [
		'example.com',
		'google.com',
		'github.com'
	]

	// Add domains to the regima list
	console.log('📝 Adding domains to regima list...\n')
	for (const domain of regimaDomains) {
		try {
			console.log(`Adding ${domain}...`)
			const entry = await manager.addDomain(domain, {
				tags: ['regima', 'tracking'],
				notes: `Added for regima tracking purposes`,
				priority: 'high'
			})
			console.log(`✅ Added ${domain} (Registrar: ${entry.whoisData.Registrar || 'Unknown'})`)
		} catch (error) {
			console.error(`❌ Failed to add ${domain}:`, error)
		}
		
		// Add delay to be respectful to WHOIS servers
		await new Promise(resolve => setTimeout(resolve, 2000))
	}

	console.log('\n📊 Current Statistics:')
	console.log('=====================')
	const stats = manager.getStats()
	console.log(`Total domains: ${stats.totalDomains}`)
	console.log('\nBy Registrar:')
	Object.entries(stats.byRegistrar).forEach(([registrar, count]) => {
		console.log(`  ${registrar}: ${count}`)
	})
	console.log('\nBy TLD:')
	Object.entries(stats.byTld).forEach(([tld, count]) => {
		console.log(`  .${tld.toLowerCase()}: ${count}`)
	})

	console.log('\n🔍 Grouping domains by different metrics:')
	console.log('==========================================')

	// Group by registrar
	console.log('\n👥 Grouped by Registrar:')
	const byRegistrar = manager.groupDomains({ groupBy: 'registrar' })
	Object.entries(byRegistrar).forEach(([registrar, domains]) => {
		console.log(`  ${registrar} (${domains.length} domains):`)
		domains.forEach(domain => {
			console.log(`    - ${domain.domain}`)
		})
	})

	// Group by TLD
	console.log('\n🌐 Grouped by TLD:')
	const byTld = manager.groupDomains({ groupBy: 'tld' })
	Object.entries(byTld).forEach(([tld, domains]) => {
		console.log(`  .${tld.toLowerCase()} (${domains.length} domains):`)
		domains.forEach(domain => {
			console.log(`    - ${domain.domain}`)
		})
	})

	// Group by creation year
	console.log('\n📅 Grouped by Creation Year:')
	const byCreatedYear = manager.groupDomains({ groupBy: 'createdYear' })
	Object.entries(byCreatedYear).forEach(([year, domains]) => {
		console.log(`  ${year} (${domains.length} domains):`)
		domains.forEach(domain => {
			console.log(`    - ${domain.domain} (Created: ${domain.whoisData['Created Date'] || 'Unknown'})`)
		})
	})

	// Group by nameservers
	console.log('\n🔧 Grouped by Primary Nameserver:')
	const byNameservers = manager.groupDomains({ groupBy: 'nameservers' })
	Object.entries(byNameservers).forEach(([nameserver, domains]) => {
		console.log(`  ${nameserver} (${domains.length} domains):`)
		domains.forEach(domain => {
			console.log(`    - ${domain.domain}`)
		})
	})

	// Display all domains with detailed info
	console.log('\n📋 All Tracked Domains:')
	console.log('=======================')
	const allDomains = manager.getDomains()
	allDomains.forEach((domain, index) => {
		console.log(`\n${index + 1}. ${domain.domain.toUpperCase()}`)
		console.log(`   Added: ${new Date(domain.addedDate).toLocaleDateString()}`)
		console.log(`   Last Updated: ${new Date(domain.lastUpdated).toLocaleDateString()}`)
		console.log(`   Registrar: ${domain.whoisData.Registrar || 'Unknown'}`)
		console.log(`   Created: ${domain.whoisData['Created Date'] || 'Unknown'}`)
		console.log(`   Expires: ${domain.whoisData['Expiry Date'] || 'Unknown'}`)
		console.log(`   Status: ${Array.isArray(domain.whoisData['Domain Status']) ? domain.whoisData['Domain Status'].join(', ') : 'Unknown'}`)
		console.log(`   Nameservers: ${Array.isArray(domain.whoisData['Name Server']) ? domain.whoisData['Name Server'].join(', ') : 'Unknown'}`)
		console.log(`   Tags: ${domain.metadata?.tags?.join(', ') || 'None'}`)
		console.log(`   Priority: ${domain.metadata?.priority || 'Unknown'}`)
		if (domain.metadata?.notes) {
			console.log(`   Notes: ${domain.metadata.notes}`)
		}
	})

	console.log('\n✨ Demo completed! Domain data saved to regima-domains-example.json')
	console.log('\n💡 You can run this script multiple times to see iterative updates.')
	console.log('💡 Use manager.updateAllDomains() to refresh WHOIS data for all domains.')
}

// Run the demonstration
demonstrateRegimaManager().catch(console.error)