# Regima Domain Tracking Guide

This guide demonstrates how to use the RegimaManager to iteratively maintain a list of "regima" domains and group them according to various metrics.

## Overview

The RegimaManager provides a comprehensive solution for tracking and analyzing domain portfolios with the following features:

- **Persistent Domain Lists**: Store domain information in JSON files
- **WHOIS Integration**: Automatic WHOIS data fetching and storage
- **Flexible Grouping**: Organize domains by multiple criteria
- **Metadata Support**: Add tags, priorities, and notes to domains
- **Statistics & Reporting**: Generate insights about your domain portfolio

## Quick Start

```typescript
import { RegimaManager } from './src/regima-manager.ts'

// Create a new manager instance
const manager = new RegimaManager('my-domains.json')

// Load existing domains (if any)
await manager.loadDomains()

// Add a domain to track
await manager.addDomain('example.com', {
  tags: ['regima', 'corporate'],
  priority: 'high',
  notes: 'Main corporate domain'
})

// Get statistics
const stats = manager.getStats()
console.log(`Tracking ${stats.totalDomains} domains`)

// Group domains by registrar
const byRegistrar = manager.groupDomains({ groupBy: 'registrar' })
```

## Core Features

### 1. Domain Management

#### Adding Domains
```typescript
// Add a domain with metadata
await manager.addDomain('regima-corp.com', {
  tags: ['regima', 'corporate', 'primary'],
  priority: 'high',
  notes: 'Main corporate website'
})

// Add a domain with custom WHOIS options
await manager.addDomain('regima-tech.net', {
  follow: 2,  // Query both registry and registrar
  tags: ['regima', 'technology'],
  priority: 'medium'
})
```

#### Updating Domains
Domains are automatically updated when added again. The original `addedDate` is preserved, but `lastUpdated` reflects the most recent modification.

#### Removing Domains
```typescript
const removed = await manager.removeDomain('old-domain.com')
if (removed) {
  console.log('Domain removed successfully')
}
```

#### Bulk Updates
```typescript
// Update WHOIS data for all tracked domains
await manager.updateAllDomains({
  follow: 2,
  timeout: 5000
})
```

### 2. Grouping & Organization

The RegimaManager supports grouping domains by various metrics:

#### Available Grouping Options
- `registrar` - Group by domain registrar
- `tld` - Group by top-level domain (.com, .org, etc.)
- `createdYear` - Group by year domain was created
- `createdMonth` - Group by year-month domain was created
- `expiryYear` - Group by year domain expires
- `expiryMonth` - Group by year-month domain expires
- `nameservers` - Group by primary nameserver
- `status` - Group by domain status

#### Grouping Examples

```typescript
// Group by registrar
const byRegistrar = manager.groupDomains({ groupBy: 'registrar' })
Object.entries(byRegistrar).forEach(([registrar, domains]) => {
  console.log(`${registrar}: ${domains.length} domains`)
  domains.forEach(domain => console.log(`  - ${domain.domain}`))
})

// Group by creation year
const byYear = manager.groupDomains({ groupBy: 'createdYear' })

// Group by TLD
const byTld = manager.groupDomains({ groupBy: 'tld' })

// Group by expiry month (useful for renewal planning)
const byExpiryMonth = manager.groupDomains({ groupBy: 'expiryMonth' })
```

### 3. Statistics & Reporting

#### Basic Statistics
```typescript
const stats = manager.getStats()
console.log({
  totalDomains: stats.totalDomains,
  registrars: Object.keys(stats.byRegistrar).length,
  tlds: Object.keys(stats.byTld).length,
  oldestDomain: stats.oldestDomain?.domain,
  newestDomain: stats.newestDomain?.domain
})
```

#### Detailed Breakdown
```typescript
// Domains by registrar
Object.entries(stats.byRegistrar).forEach(([registrar, count]) => {
  console.log(`${registrar}: ${count} domains`)
})

// Domains by TLD
Object.entries(stats.byTld).forEach(([tld, count]) => {
  console.log(`.${tld.toLowerCase()}: ${count} domains`)
})

// Domains by status
Object.entries(stats.byStatus).forEach(([status, count]) => {
  console.log(`${status}: ${count} domains`)
})
```

### 4. Data Persistence

Domain data is automatically saved to a JSON file with the following structure:

```json
{
  "domains": [
    {
      "domain": "example.com",
      "addedDate": "2024-01-15T10:30:00.000Z",
      "lastUpdated": "2024-01-15T10:30:00.000Z",
      "whoisData": {
        "Domain Name": "EXAMPLE.COM",
        "Registrar": "Example Registrar Inc.",
        "Created Date": "2000-01-01T00:00:00Z",
        "Expiry Date": "2025-01-01T00:00:00Z",
        "Domain Status": ["clientTransferProhibited"],
        "Name Server": ["ns1.example.com", "ns2.example.com"]
      },
      "metadata": {
        "tags": ["regima", "corporate"],
        "priority": "high",
        "notes": "Main corporate domain"
      }
    }
  ],
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "totalDomains": 1
}
```

## Use Cases

### 1. Brand Protection Monitoring
Track all domains related to your brand across different TLDs:

```typescript
const brandDomains = [
  'regima.com', 'regima.org', 'regima.net',
  'regima.co', 'regima.io', 'regima.app'
]

for (const domain of brandDomains) {
  await manager.addDomain(domain, {
    tags: ['brand-protection', 'regima'],
    priority: 'high'
  })
}

// Group by TLD to see coverage
const coverage = manager.groupDomains({ groupBy: 'tld' })
```

### 2. Portfolio Analysis
Analyze domain acquisition patterns and registrar distribution:

```typescript
// When were domains acquired?
const acquisitionPattern = manager.groupDomains({ groupBy: 'createdYear' })

// Which registrars do we use most?
const registrarDistribution = manager.groupDomains({ groupBy: 'registrar' })

// What's our renewal schedule?
const renewalSchedule = manager.groupDomains({ groupBy: 'expiryMonth' })
```

### 3. Infrastructure Management
Track domains by their DNS infrastructure:

```typescript
// Group by nameserver for infrastructure planning
const dnsGroups = manager.groupDomains({ groupBy: 'nameservers' })

// Find domains that need attention
const stats = manager.getStats()
Object.entries(stats.byStatus).forEach(([status]) => {
  if (status.includes('Hold') || status.includes('Suspended')) {
    console.log(`⚠️ Domains with ${status} status need attention`)
  }
})
```

## Best Practices

### 1. Respectful WHOIS Querying
- Add delays between domain additions to avoid overwhelming WHOIS servers
- Use the `timeout` option for slow WHOIS servers
- Consider running bulk updates during off-peak hours

```typescript
// Add delay between domains
for (const domain of domains) {
  await manager.addDomain(domain, options)
  await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
}
```

### 2. Regular Updates
Schedule regular updates to keep WHOIS data fresh:

```typescript
// Weekly update routine
async function weeklyUpdate() {
  console.log('Starting weekly domain update...')
  await manager.updateAllDomains({
    follow: 1, // Fast registry-only updates
    timeout: 3000
  })
  console.log('Update complete!')
}
```

### 3. Backup Strategy
Regularly backup your domain data:

```typescript
// Create timestamped backup
const timestamp = new Date().toISOString().split('T')[0]
const backupFile = `regima-domains-backup-${timestamp}.json`
const manager = new RegimaManager(backupFile)
// ... save current data to backup file
```

## API Reference

### RegimaManager Class

#### Constructor
```typescript
constructor(dataFile: string = 'regima-domains.json')
```

#### Methods

**loadDomains()**
Load domains from persistent storage.

**saveDomains()**
Save domains to persistent storage.

**addDomain(domain, options?)**
Add or update a domain in the tracking list.

**removeDomain(domain)**
Remove a domain from the tracking list.

**getDomains()**
Get all tracked domains.

**groupDomains(options)**
Group domains by specified criteria.

**updateAllDomains(options?)**
Update WHOIS data for all tracked domains.

**getStats()**
Get statistics about the domain portfolio.

## Examples

See the included examples:
- `examples/regima-domain-manager.ts` - Comprehensive usage example
- `regima-demo.mjs` - Quick demonstration script

Run the demonstration:
```bash
node regima-demo.mjs
```

This will show all the key features with sample data and create a `regima-demo.json` file with the results.