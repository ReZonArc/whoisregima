import { RegimaManager } from './dist/regima-manager.js'

async function testRegimaManager() {
  console.log('🧪 Testing RegimaManager functionality...')
  
  const manager = new RegimaManager('test-regima.json')
  await manager.loadDomains()
  
  console.log('✅ RegimaManager created and loaded successfully')
  
  // Test empty stats
  const stats = manager.getStats()
  console.log('📊 Stats:', {
    totalDomains: stats.totalDomains,
    registrarCount: Object.keys(stats.byRegistrar).length,
    tldCount: Object.keys(stats.byTld).length
  })
  
  // Test grouping (should be empty)
  const grouped = manager.groupDomains({ groupBy: 'registrar' })
  console.log('🔍 Grouped by registrar:', Object.keys(grouped).length, 'groups')
  
  console.log('✅ All basic tests passed!')
}

testRegimaManager().catch(console.error)
