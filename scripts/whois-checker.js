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
      
      // Enhanced options for better data capture
      await manager.addDomain(domain, {
        timeout: 15000,  // Extended timeout for reliability
        follow: 2,       // Follow up to 2 redirects
        ignorePrivacy: false  // Capture privacy protection info
      })
      
      const domains = manager.getDomains()
      const domainEntry = domains.find(d => d.domain === domain)
      
      if (domainEntry && domainEntry.whoisData) {
        // Create comprehensive record with complete WHOIS data
        const completeRecord = {
          domain: domainEntry.domain,
          lastUpdated: domainEntry.lastUpdated || new Date().toISOString(),
          whoisData: domainEntry.whoisData,
          metadata: {
            checkedAt: new Date().toISOString(),
            source: 'whois-checker-action',
            timeout: 15000,
            followRedirects: 2,
            dataCompleteness: this.assessDataCompleteness(domainEntry.whoisData)
          }
        }
        
        console.log(`✅ Successfully fetched complete WHOIS data for ${domain}`)
        return completeRecord
      }
      
      // If no data, still create a record to track the attempt
      console.log(`⚠️ No WHOIS data found for ${domain} - creating placeholder record`)
      return {
        domain: domain,
        lastUpdated: new Date().toISOString(),
        whoisData: { 
          status: 'not_found',
          message: 'No WHOIS data available for this domain'
        },
        metadata: {
          checkedAt: new Date().toISOString(),
          source: 'whois-checker-action',
          dataCompleteness: 'none'
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch WHOIS for ${domain}:`, error.message)
      
      // Create error record to maintain complete tracking
      return {
        domain: domain,
        lastUpdated: new Date().toISOString(),
        whoisData: { 
          error: error.message,
          status: 'error'
        },
        metadata: {
          checkedAt: new Date().toISOString(),
          source: 'whois-checker-action',
          dataCompleteness: 'error',
          errorType: error.name || 'UnknownError'
        }
      }
    }
  }

  assessDataCompleteness(whoisData) {
    if (!whoisData || typeof whoisData !== 'object') return 'none'
    
    const keyFields = [
      'Registry Expiry Date', 'Expiry Date', 'Expiration Date',
      'Registrar', 'Registry Registrar ID',
      'Name Server', 'Domain Status',
      'Registrant Organization', 'Registrant Name'
    ]
    
    const foundFields = keyFields.filter(field => whoisData[field])
    const completeness = foundFields.length / keyFields.length
    
    if (completeness >= 0.8) return 'complete'
    if (completeness >= 0.5) return 'partial'
    if (completeness > 0) return 'minimal'
    return 'none'
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
    
    // Always save records to ensure complete data preservation
    if (!newRecord) {
      console.log(`⚠️ Critical error - unable to create record for ${domain}`)
      this.stats.errors++
      return
    }

    if (!existingRecord) {
      // New domain - always save complete record
      await this.saveRecord(domain, newRecord)
      console.log(`✅ Added new complete record for ${domain}`)
      this.stats.added++
    } else if (this.hasSignificantChanges(existingRecord, newRecord)) {
      // Domain has changes - preserve history and update
      await this.archiveRecord(domain, existingRecord)
      await this.saveRecord(domain, newRecord)
      console.log(`🔄 Updated record for ${domain} (previous version archived)`)
      this.stats.updated++
    } else {
      // No significant changes, but refresh timestamp for completeness
      newRecord.metadata.refreshedAt = new Date().toISOString()
      await this.saveRecord(domain, newRecord)
      console.log(`⚪ Refreshed record for ${domain} (no significant changes)`)
      this.stats.unchanged++
    }

    // Add delay to be respectful to WHOIS servers
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  async generateSummary() {
    const timestamp = new Date().toISOString()
    const formattedDate = new Date().toLocaleString('en-US', { 
      timeZone: 'UTC', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }) + ' UTC'
    
    let summary = `# 🌍 WHOIS Records - Complete Registry\n\n`
    summary += `> **Comprehensive WHOIS monitoring with automated change detection and historical archiving**\n\n`
    
    summary += `**Last Updated:** ${formattedDate}\n`
    summary += `**Generated:** ${timestamp}\n`
    summary += `**Total Domains Monitored:** ${this.stats.total}\n\n`
    
    // Enhanced statistics with success rates
    const successRate = this.stats.total > 0 ? 
      (((this.stats.added + this.stats.updated + this.stats.unchanged) / this.stats.total) * 100).toFixed(1) : '0.0'
    
    summary += `## 📊 Processing Statistics\n\n`
    summary += `| Metric | Count | Percentage |\n`
    summary += `|--------|-------|-----------|\n`
    summary += `| **Total Domains** | ${this.stats.total} | 100.0% |\n`
    summary += `| New Records Added | ${this.stats.added} | ${this.stats.total > 0 ? ((this.stats.added / this.stats.total) * 100).toFixed(1) : '0.0'}% |\n`
    summary += `| Records Updated | ${this.stats.updated} | ${this.stats.total > 0 ? ((this.stats.updated / this.stats.total) * 100).toFixed(1) : '0.0'}% |\n`
    summary += `| Historical Archives | ${this.stats.archived} | - |\n`
    summary += `| Unchanged Records | ${this.stats.unchanged} | ${this.stats.total > 0 ? ((this.stats.unchanged / this.stats.total) * 100).toFixed(1) : '0.0'}% |\n`
    summary += `| Processing Errors | ${this.stats.errors} | ${this.stats.total > 0 ? ((this.stats.errors / this.stats.total) * 100).toFixed(1) : '0.0'}% |\n`
    summary += `| **Success Rate** | **${this.stats.added + this.stats.updated + this.stats.unchanged}** | **${successRate}%** |\n\n`
    
    // Repository structure
    summary += `## 📁 Repository Structure\n\n`
    summary += `This repository maintains a comprehensive WHOIS database with the following organization:\n\n`
    summary += `\`\`\`\n`
    summary += `whois/\n`
    summary += `├── json/          # Complete WHOIS data (machine-readable)\n`
    summary += `├── md/            # Human-readable WHOIS summaries  \n`
    summary += `├── archive/       # Historical records with timestamps\n`
    summary += `└── regima.md      # This comprehensive overview\n`
    summary += `\`\`\`\n\n`
    
    summary += `### Data Formats\n\n`
    summary += `- **JSON Records:** Complete WHOIS data with metadata for programmatic access\n`
    summary += `- **Markdown Files:** Formatted summaries for human readability\n`  
    summary += `- **Archive Files:** Timestamped historical records when changes are detected\n`
    summary += `- **Summary Report:** This comprehensive overview with statistics and links\n\n`
    
    // Enhanced domain listing with data quality assessment
    try {
      const jsonFiles = await fs.readdir(this.jsonDir)
      const domains = []
      
      for (const file of jsonFiles.filter(f => f.endsWith('.json'))) {
        const domain = file.replace('.json', '')
        const jsonPath = path.join(this.jsonDir, file)
        
        try {
          const content = await fs.readFile(jsonPath, 'utf-8')
          const data = JSON.parse(content)
          const completeness = data.metadata?.dataCompleteness || 'unknown'
          domains.push({ domain, completeness, lastUpdated: data.lastUpdated })
        } catch (error) {
          domains.push({ domain, completeness: 'error', lastUpdated: 'unknown' })
        }
      }
      
      domains.sort((a, b) => a.domain.localeCompare(b.domain))
      
      if (domains.length > 0) {
        summary += `## 🎯 Tracked Domains (${domains.length})\n\n`
        summary += `| Domain | Data Quality | JSON | Markdown | Last Updated |\n`
        summary += `|--------|-------------|------|----------|-------------|\n`
        
        for (const { domain, completeness, lastUpdated } of domains) {
          const qualityEmoji = this.getQualityEmoji(completeness)
          const formattedDate = lastUpdated !== 'unknown' ? 
            new Date(lastUpdated).toLocaleDateString() : 'Unknown'
          
          summary += `| **${domain}** | ${qualityEmoji} ${completeness} | [📄](json/${domain}.json) | [📝](md/${domain}.md) | ${formattedDate} |\n`
        }
        summary += `\n`
        
        // Data quality summary
        const qualityStats = domains.reduce((acc, { completeness }) => {
          acc[completeness] = (acc[completeness] || 0) + 1
          return acc
        }, {})
        
        summary += `### 🎯 Data Quality Overview\n\n`
        for (const [quality, count] of Object.entries(qualityStats)) {
          const percentage = ((count / domains.length) * 100).toFixed(1)
          const emoji = this.getQualityEmoji(quality)
          summary += `- ${emoji} **${quality}:** ${count} domains (${percentage}%)\n`
        }
        summary += `\n`
      } else {
        summary += `## ⚠️ No Domain Records Found\n\n`
        summary += `No WHOIS records have been generated yet. This could indicate:\n`
        summary += `- First run of the monitoring system\n`
        summary += `- Network connectivity issues\n`
        summary += `- Empty domain list in regima-domains.txt\n\n`
      }
    } catch (error) {
      console.error('Error listing domains for summary:', error.message)
      summary += `## ❌ Error Generating Domain List\n\n`
      summary += `Unable to read domain records: ${error.message}\n\n`
    }
    
    // Automation information
    summary += `## 🤖 Automation & Monitoring\n\n`
    summary += `This WHOIS database is automatically maintained through GitHub Actions:\n\n`
    summary += `- **Daily Monitoring:** Runs every day at 3:00 AM UTC\n`
    summary += `- **Change Detection:** Monitors key WHOIS fields for updates\n`
    summary += `- **Historical Preservation:** Archives old records when changes are detected\n`
    summary += `- **Rate Limiting:** Respects WHOIS server policies with 2-second delays\n`
    summary += `- **Error Handling:** Graceful failure with detailed logging\n`
    summary += `- **Complete Records:** Saves comprehensive WHOIS data permanently\n\n`
    
    summary += `### 🔄 Last Processing Results\n\n`
    if (this.stats.total > 0) {
      summary += `Successfully processed **${this.stats.total}** domains with **${successRate}%** success rate.\n`
      if (this.stats.updated > 0 || this.stats.added > 0) {
        summary += `**${this.stats.updated + this.stats.added}** records were updated or added to ensure data completeness.\n`
      }
      if (this.stats.archived > 0) {
        summary += `**${this.stats.archived}** historical records were preserved in the archive.\n`
      }
    } else {
      summary += `No domains were processed in the last run.\n`
    }
    summary += `\n`
    
    summary += `---\n\n`
    summary += `*🔍 Generated automatically by [whois-checker GitHub Action](../.github/workflows/whois-checker.yml)*  \n`
    summary += `*📅 Report timestamp: ${timestamp}*  \n`
    summary += `*🌐 Repository: [ReZonArc/whoisregima](https://github.com/ReZonArc/whoisregima)*\n`
    
    await fs.writeFile(this.summaryFile, summary)
    console.log(`📝 Generated comprehensive summary report: ${this.summaryFile}`)
  }

  getQualityEmoji(completeness) {
    switch (completeness) {
      case 'complete': return '🟢'
      case 'partial': return '🟡'
      case 'minimal': return '🟠'
      case 'error': return '🔴'
      case 'none': return '⚫'
      default: return '❓'
    }
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