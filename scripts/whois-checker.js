#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

/**
 * WHOIS Record Management Script
 * 
 * This script:
 * 1. Reads domains from regima-domains.txt
 * 2. Checks existing WHOIS records for changes
 * 3. Archives old records when changes are detected
 * 4. Updates records with new WHOIS data
 * 5. Generates summary reports
 */

class WhoisChecker {
  constructor() {
    this.whoisDir = path.join(rootDir, 'whois')
    this.jsonDir = path.join(this.whoisDir, 'json')
    this.mdDir = path.join(this.whoisDir, 'md')
    this.archiveDir = path.join(this.whoisDir, 'archive')
    this.domainsFile = path.join(rootDir, 'regima-domains.txt')
    this.summaryFile = path.join(this.whoisDir, 'regima.md')
    
    this.stats = {
      total: 0,
      updated: 0,
      added: 0,
      archived: 0,
      errors: 0,
      unchanged: 0
    }
  }

  async init() {
    // Ensure all directories exist
    await fs.mkdir(this.whoisDir, { recursive: true })
    await fs.mkdir(this.jsonDir, { recursive: true })
    await fs.mkdir(this.mdDir, { recursive: true })
    await fs.mkdir(this.archiveDir, { recursive: true })
    
    console.log('📁 Directory structure created')
  }

  async loadDomains() {
    try {
      const content = await fs.readFile(this.domainsFile, 'utf-8')
      const domains = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
          // Remove number prefixes like "1.regima.com"
          const match = line.match(/^\d+\.(.+)$/)
          return match ? match[1] : line
        })
        .filter(domain => domain.includes('.')) // Basic domain validation

      console.log(`📋 Loaded ${domains.length} domains from regima-domains.txt`)
      return domains
    } catch (error) {
      console.error('❌ Failed to load domains:', error.message)
      return []
    }
  }

  async getExistingRecord(domain) {
    const jsonFile = path.join(this.jsonDir, `${domain}.json`)
    try {
      const content = await fs.readFile(jsonFile, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      return null
    }
  }

  async archiveRecord(domain, oldRecord) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archiveFile = path.join(this.archiveDir, `${domain}-${timestamp}.json`)
    
    try {
      await fs.writeFile(archiveFile, JSON.stringify(oldRecord, null, 2))
      console.log(`🗄️ Archived old record for ${domain}`)
      this.stats.archived++
    } catch (error) {
      console.error(`❌ Failed to archive record for ${domain}:`, error.message)
    }
  }

  async fetchWhoisData(domain) {
    try {
      console.log(`🔍 Fetching WHOIS data for ${domain}...`)
      
      // Use dynamic import to avoid ESM issues
      const { RegimaManager } = await import('../dist/regima-manager.js')
      
      const manager = new RegimaManager()
      await manager.addDomain(domain, {
        timeout: 10000,  // Increased timeout for reliability
        follow: 1
      })
      
      const domains = manager.getDomains()
      const domainEntry = domains.find(d => d.domain === domain)
      
      if (domainEntry && domainEntry.whoisData) {
        return {
          domain: domainEntry.domain,
          lastUpdated: domainEntry.lastUpdated,
          whoisData: domainEntry.whoisData,
          metadata: {
            checkedAt: new Date().toISOString(),
            source: 'whois-checker-action'
          }
        }
      }
      
      return null
    } catch (error) {
      console.error(`❌ Failed to fetch WHOIS for ${domain}:`, error.message)
      return null
    }
  }

  hasSignificantChanges(oldRecord, newRecord) {
    if (!oldRecord || !newRecord) return true

    // Compare key WHOIS fields that indicate real changes
    const keyFields = [
      'Registry Expiry Date',
      'Expiry Date', 
      'Expiration Date',
      'Registrar',
      'Registry Registrar ID',
      'Name Server',
      'Domain Status',
      'Updated Date',
      'Registrant Organization',
      'Registrant Name'
    ]

    for (const field of keyFields) {
      const oldValue = oldRecord.whoisData?.[field]
      const newValue = newRecord.whoisData?.[field]
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        return true
      }
    }

    return false
  }

  async saveRecord(domain, record) {
    const jsonFile = path.join(this.jsonDir, `${domain}.json`)
    const mdFile = path.join(this.mdDir, `${domain}.md`)
    
    try {
      // Save JSON format
      await fs.writeFile(jsonFile, JSON.stringify(record, null, 2))
      
      // Save Markdown format
      const markdown = this.generateMarkdown(record)
      await fs.writeFile(mdFile, markdown)
      
      console.log(`💾 Saved record for ${domain}`)
    } catch (error) {
      console.error(`❌ Failed to save record for ${domain}:`, error.message)
    }
  }

  generateMarkdown(record) {
    const whoisData = record.whoisData || {}
    
    let markdown = `# WHOIS Record: ${record.domain}\n\n`
    markdown += `**Last Updated:** ${record.lastUpdated}\n`
    markdown += `**Checked At:** ${record.metadata?.checkedAt}\n\n`
    
    markdown += `## WHOIS Information\n\n`
    
    for (const [key, value] of Object.entries(whoisData)) {
      if (value) {
        const displayValue = Array.isArray(value) ? value.join(', ') : value
        markdown += `**${key}:** ${displayValue}\n\n`
      }
    }
    
    return markdown
  }

  async processDomain(domain) {
    this.stats.total++
    
    console.log(`\n📍 Processing ${domain} (${this.stats.total})...`)
    
    const existingRecord = await this.getExistingRecord(domain)
    const newRecord = await this.fetchWhoisData(domain)
    
    if (!newRecord) {
      console.log(`⚠️ No WHOIS data available for ${domain}`)
      this.stats.errors++
      return
    }

    if (!existingRecord) {
      // New domain
      await this.saveRecord(domain, newRecord)
      console.log(`✅ Added new record for ${domain}`)
      this.stats.added++
    } else if (this.hasSignificantChanges(existingRecord, newRecord)) {
      // Domain has changes
      await this.archiveRecord(domain, existingRecord)
      await this.saveRecord(domain, newRecord)
      console.log(`🔄 Updated record for ${domain}`)
      this.stats.updated++
    } else {
      // No significant changes
      console.log(`⚪ No changes for ${domain}`)
      this.stats.unchanged++
    }

    // Add delay to be respectful to WHOIS servers
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  async generateSummary() {
    const timestamp = new Date().toISOString()
    
    let summary = `# WHOIS Records Summary\n\n`
    summary += `**Generated:** ${timestamp}\n`
    summary += `**Total Domains Checked:** ${this.stats.total}\n\n`
    
    summary += `## Statistics\n\n`
    summary += `| Metric | Count |\n`
    summary += `|--------|-------|\n`
    summary += `| Total Domains | ${this.stats.total} |\n`
    summary += `| New Records Added | ${this.stats.added} |\n`
    summary += `| Records Updated | ${this.stats.updated} |\n`
    summary += `| Records Archived | ${this.stats.archived} |\n`
    summary += `| Unchanged Records | ${this.stats.unchanged} |\n`
    summary += `| Errors | ${this.stats.errors} |\n\n`
    
    summary += `## File Structure\n\n`
    summary += `- **JSON Records:** \`whois/json/\` - Machine-readable WHOIS data\n`
    summary += `- **Markdown Files:** \`whois/md/\` - Human-readable WHOIS summaries\n`  
    summary += `- **Archive:** \`whois/archive/\` - Historical records with timestamps\n\n`
    
    // List current domains
    try {
      const jsonFiles = await fs.readdir(this.jsonDir)
      const domains = jsonFiles
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort()
      
      if (domains.length > 0) {
        summary += `## Tracked Domains (${domains.length})\n\n`
        for (const domain of domains) {
          summary += `- [${domain}](json/${domain}.json) | [MD](md/${domain}.md)\n`
        }
        summary += `\n`
      }
    } catch (error) {
      console.error('Error listing domains for summary:', error.message)
    }
    
    summary += `---\n`
    summary += `*Generated by whois-checker GitHub Action*\n`
    
    await fs.writeFile(this.summaryFile, summary)
    console.log(`📝 Generated summary report: ${this.summaryFile}`)
  }

  async run() {
    console.log('🚀 Starting WHOIS Record Management...\n')
    
    await this.init()
    const domains = await this.loadDomains()
    
    if (domains.length === 0) {
      console.log('⚠️ No domains to process')
      return
    }

    console.log(`📊 Processing ${domains.length} domains...\n`)
    
    for (const domain of domains) {
      await this.processDomain(domain)
    }
    
    await this.generateSummary()
    
    console.log('\n📋 Final Statistics:')
    console.log(`   Total: ${this.stats.total}`)
    console.log(`   Added: ${this.stats.added}`)
    console.log(`   Updated: ${this.stats.updated}`)
    console.log(`   Archived: ${this.stats.archived}`)
    console.log(`   Unchanged: ${this.stats.unchanged}`)
    console.log(`   Errors: ${this.stats.errors}`)
    
    console.log('\n✅ WHOIS Record Management completed!')
  }
}

// Run the script
const checker = new WhoisChecker()
checker.run().catch(error => {
  console.error('💥 Script failed:', error.message)
  process.exit(1)
})