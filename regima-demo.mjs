import { RegimaManager } from './dist/regima-manager.js'

async function demonstrateRegimaFeatures() {
  console.log('🚀 Regima Domain Manager Demonstration')
  console.log('=====================================\n')

  const manager = new RegimaManager('regima-demo.json')
  await manager.loadDomains()

  console.log('📊 Starting with empty or existing data...')
  const initialStats = manager.getStats()
  console.log(`Initial domain count: ${initialStats.totalDomains}\n`)

  // Mock some domain data for demonstration (since real WHOIS calls take time)
  const mockDomains = [
    {
      domain: 'regima-corp.com',
      addedDate: '2024-01-15T00:00:00.000Z',
      lastUpdated: '2024-01-15T00:00:00.000Z',
      whoisData: {
        'Domain Name': 'REGIMA-CORP.COM',
        'Registrar': 'GoDaddy.com, LLC',
        'Created Date': '2020-03-15T14:30:00Z',
        'Expiry Date': '2025-03-15T14:30:00Z',
        'Domain Status': ['clientTransferProhibited', 'clientUpdateProhibited'],
        'Name Server': ['ns1.godaddy.com', 'ns2.godaddy.com']
      },
      metadata: { tags: ['regima', 'corporate'], priority: 'high' }
    },
    {
      domain: 'regima-solutions.org',
      addedDate: '2024-01-16T00:00:00.000Z',
      lastUpdated: '2024-01-16T00:00:00.000Z',
      whoisData: {
        'Domain Name': 'REGIMA-SOLUTIONS.ORG',
        'Registrar': 'Namecheap, Inc.',
        'Created Date': '2019-07-22T10:15:00Z',
        'Expiry Date': '2024-07-22T10:15:00Z',
        'Domain Status': ['ok'],
        'Name Server': ['dns1.namecheap.com', 'dns2.namecheap.com']
      },
      metadata: { tags: ['regima', 'solutions'], priority: 'medium' }
    },
    {
      domain: 'regima-tech.net',
      addedDate: '2024-01-17T00:00:00.000Z',
      lastUpdated: '2024-01-17T00:00:00.000Z',
      whoisData: {
        'Domain Name': 'REGIMA-TECH.NET',
        'Registrar': 'GoDaddy.com, LLC',
        'Created Date': '2021-11-08T09:45:00Z',
        'Expiry Date': '2025-11-08T09:45:00Z',
        'Domain Status': ['clientTransferProhibited'],
        'Name Server': ['ns1.godaddy.com', 'ns2.godaddy.com']
      },
      metadata: { tags: ['regima', 'technology'], priority: 'high' }
    }
  ]

  // Manually add mock domains for demonstration
  manager['domains'] = mockDomains
  await manager.saveDomains()

  console.log('📝 Added sample regima domains for demonstration\n')

  // Show statistics
  console.log('📊 Domain Statistics:')
  console.log('====================')
  const stats = manager.getStats()
  console.log(`Total domains: ${stats.totalDomains}`)
  
  console.log('\nBy Registrar:')
  Object.entries(stats.byRegistrar).forEach(([registrar, count]) => {
    console.log(`  ${registrar}: ${count} domains`)
  })
  
  console.log('\nBy TLD:')
  Object.entries(stats.byTld).forEach(([tld, count]) => {
    console.log(`  .${tld.toLowerCase()}: ${count} domains`)
  })

  console.log('\nBy Status:')
  Object.entries(stats.byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} domains`)
  })

  // Demonstrate grouping functionality
  console.log('\n🔍 Domain Grouping Examples:')
  console.log('============================')

  console.log('\n👥 Grouped by Registrar:')
  const byRegistrar = manager.groupDomains({ groupBy: 'registrar' })
  Object.entries(byRegistrar).forEach(([registrar, domains]) => {
    console.log(`  ${registrar} (${domains.length} domains):`)
    domains.forEach(domain => {
      console.log(`    - ${domain.domain}`)
    })
  })

  console.log('\n🌐 Grouped by TLD:')
  const byTld = manager.groupDomains({ groupBy: 'tld' })
  Object.entries(byTld).forEach(([tld, domains]) => {
    console.log(`  .${tld.toLowerCase()} (${domains.length} domains):`)
    domains.forEach(domain => {
      console.log(`    - ${domain.domain}`)
    })
  })

  console.log('\n📅 Grouped by Creation Year:')
  const byYear = manager.groupDomains({ groupBy: 'createdYear' })
  Object.entries(byYear).forEach(([year, domains]) => {
    console.log(`  ${year} (${domains.length} domains):`)
    domains.forEach(domain => {
      console.log(`    - ${domain.domain}`)
    })
  })

  console.log('\n📆 Grouped by Creation Month:')
  const byMonth = manager.groupDomains({ groupBy: 'createdMonth' })
  Object.entries(byMonth).forEach(([month, domains]) => {
    console.log(`  ${month} (${domains.length} domains):`)
    domains.forEach(domain => {
      console.log(`    - ${domain.domain}`)
    })
  })

  console.log('\n🔧 Grouped by Primary Nameserver:')
  const byNameserver = manager.groupDomains({ groupBy: 'nameservers' })
  Object.entries(byNameserver).forEach(([nameserver, domains]) => {
    console.log(`  ${nameserver} (${domains.length} domains):`)
    domains.forEach(domain => {
      console.log(`    - ${domain.domain}`)
    })
  })

  console.log('\n📋 Detailed Domain List:')
  console.log('========================')
  const allDomains = manager.getDomains()
  allDomains.forEach((domain, index) => {
    console.log(`\n${index + 1}. ${domain.domain.toUpperCase()}`)
    console.log(`   Added: ${new Date(domain.addedDate).toLocaleDateString()}`)
    console.log(`   Registrar: ${domain.whoisData['Registrar'] || 'Unknown'}`)
    console.log(`   Created: ${domain.whoisData['Created Date'] || 'Unknown'}`)
    console.log(`   Expires: ${domain.whoisData['Expiry Date'] || 'Unknown'}`)
    console.log(`   Status: ${Array.isArray(domain.whoisData['Domain Status']) ? domain.whoisData['Domain Status'].join(', ') : 'Unknown'}`)
    console.log(`   Tags: ${domain.metadata?.tags?.join(', ') || 'None'}`)
    console.log(`   Priority: ${domain.metadata?.priority || 'Unknown'}`)
  })

  console.log('\n✨ Demonstration completed!')
  console.log('\n💡 Key Features Demonstrated:')
  console.log('   - ✅ Iterative domain list management')
  console.log('   - ✅ Persistent storage (JSON file)')
  console.log('   - ✅ Grouping by registrar, TLD, creation dates, nameservers')
  console.log('   - ✅ Domain statistics and reporting')
  console.log('   - ✅ Metadata support (tags, priority, notes)')
  console.log('   - ✅ WHOIS data integration')
  
  console.log('\n📁 Data saved to: regima-demo.json')
}

demonstrateRegimaFeatures().catch(console.error)
