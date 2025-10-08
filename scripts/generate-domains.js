#!/usr/bin/env node

/**
 * Script to generate domain combinations from regima patterns and TLD extensions
 */

import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

/**
 * Read and parse patterns from regima-patterns.txt
 */
async function readPatterns() {
    const patternsPath = join(PROJECT_ROOT, 'regima-patterns.txt')
    try {
        const content = await fs.readFile(patternsPath, 'utf-8')
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
    } catch (error) {
        console.error('Error reading patterns file:', error)
        return []
    }
}

/**
 * Read and parse TLD extensions from tld-extensions.txt
 */
async function readTLDs() {
    const tldPath = join(PROJECT_ROOT, 'tld-extensions.txt')
    try {
        const content = await fs.readFile(tldPath, 'utf-8')
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
    } catch (error) {
        console.error('Error reading TLD file:', error)
        return []
    }
}

/**
 * Read existing domains from regima-domains.txt
 */
async function readExistingDomains() {
    const domainsPath = join(PROJECT_ROOT, 'regima-domains.txt')
    try {
        const content = await fs.readFile(domainsPath, 'utf-8')
        const domains = content.split('\n')
            .map(line => line.trim().replace(/^\d+\./, '')) // Remove numbering if present
            .filter(line => line && !line.startsWith('#') && !line.includes('???'))
        return new Set(domains)
    } catch (error) {
        console.error('Error reading existing domains file:', error)
        return new Set()
    }
}

/**
 * Generate domain combinations from patterns and TLDs
 */
function generateDomainCombinations(patterns, tlds) {
    const combinations = new Set()
    
    for (const pattern of patterns) {
        if (!pattern) continue
        
        for (const tld of tlds) {
            if (!tld) continue
            
            const cleanTld = tld.startsWith('.') ? tld.substring(1) : tld
            generatePatternCombinations(pattern, cleanTld, combinations)
        }
    }
    
    return Array.from(combinations).sort()
}

/**
 * Generate combinations for a specific pattern and TLD
 */
function generatePatternCombinations(pattern, tld, combinations) {
    // Only generate for common TLDs to avoid too many combinations
    const commonTlds = ['com', 'org', 'net', 'edu', 'gov', 'co', 'uk', 'za', 'eu', 'de', 'fr', 'it', 'es', 'nl', 'be', 'au', 'ca', 'jp', 'br', 'in', 'zone']
    
    if (!commonTlds.includes(tld.toLowerCase())) {
        return // Skip uncommon TLDs
    }
    
    // Handle different pattern structures
    if (pattern === 'regima.*') {
        // Simple pattern: regima.com, regima.org, etc.
        const domain = `regima.${tld}`
        if (isValidDomain(domain)) {
            combinations.add(domain.toLowerCase())
        }
    } else if (pattern === 'regima.*.*') {
        // Two-level pattern: regima.co.uk, regima.co.za, etc.
        // Only for country code TLDs that commonly use second-level domains
        const secondLevelMappings = {
            'uk': ['co', 'org', 'net'],
            'za': ['co', 'org', 'net'],
            'au': ['com', 'org', 'net'],
            'br': ['com', 'org', 'net']
        }
        
        const secondLevels = secondLevelMappings[tld] || []
        for (const sld of secondLevels) {
            const domain = `regima.${sld}.${tld}`
            if (isValidDomain(domain)) {
                combinations.add(domain.toLowerCase())
            }
        }
    } else if (pattern === 'regima*.*') {
        // Prefix pattern: regimazone.com, regimaskin.org, etc.
        const suffixes = ['zone', 'skin', 'pro']
        for (const suffix of suffixes) {
            const domain = `regima${suffix}.${tld}`
            if (isValidDomain(domain)) {
                combinations.add(domain.toLowerCase())
            }
        }
    } else if (pattern === 'regima*.*.*') {
        // Complex prefix pattern with multiple levels - only for specific TLDs
        if (['uk', 'za'].includes(tld.toLowerCase())) {
            const suffixes = ['zone', 'skin']
            const secondLevels = ['co']
            for (const suffix of suffixes) {
                for (const sld of secondLevels) {
                    const domain = `regima${suffix}.${sld}.${tld}`
                    if (isValidDomain(domain)) {
                        combinations.add(domain.toLowerCase())
                    }
                }
            }
        }
    } else if (pattern === '*regima.*') {
        // Wildcard prefix: wwwregima.com, appregima.org, etc.
        // Only generate a few for common TLDs
        const prefixes = ['www', 'my']
        for (const prefix of prefixes) {
            const domain = `${prefix}regima.${tld}`
            if (isValidDomain(domain)) {
                combinations.add(domain.toLowerCase())
            }
        }
    } else if (pattern === '*regima.*.*') {
        // Wildcard prefix with two levels - very limited
        if (['uk', 'za'].includes(tld.toLowerCase())) {
            const prefixes = ['www']
            const secondLevels = ['co']
            for (const prefix of prefixes) {
                for (const sld of secondLevels) {
                    const domain = `${prefix}regima.${sld}.${tld}`
                    if (isValidDomain(domain)) {
                        combinations.add(domain.toLowerCase())
                    }
                }
            }
        }
    } else if (pattern === '*regima*.*') {
        // Both prefix and suffix wildcards - limited to main TLDs
        if (['com', 'org', 'net'].includes(tld.toLowerCase())) {
            const combinations_limited = [
                { prefix: 'www', suffix: 'zone' },
                { prefix: 'my', suffix: 'zone' }
            ]
            for (const combo of combinations_limited) {
                const domain = `${combo.prefix}regima${combo.suffix}.${tld}`
                if (isValidDomain(domain)) {
                    combinations.add(domain.toLowerCase())
                }
            }
        }
    } else if (pattern === '*regima*.*.*') {
        // Complex pattern - very limited generation
        if (tld.toLowerCase() === 'uk') {
            const domain = `wwwregimazone.co.${tld}`
            if (isValidDomain(domain)) {
                combinations.add(domain.toLowerCase())
            }
        }
    }
}

/**
 * Basic domain validation
 */
function isValidDomain(domain) {
    if (!domain || domain.length === 0) return false
    if (domain.includes('..') || domain.includes(' ')) return false
    if (domain.startsWith('.') || domain.endsWith('.')) return false
    
    const parts = domain.split('.')
    if (parts.length < 2) return false
    
    // Each part must be non-empty and contain valid characters
    for (const part of parts) {
        if (part.length === 0) return false
        if (!/^[a-z0-9-]+$/i.test(part)) return false
        if (part.startsWith('-') || part.endsWith('-')) return false
    }
    
    // TLD (last part) should be at least 2 characters and not start with digit
    const tld = parts[parts.length - 1]
    if (tld.length < 2 || /^[0-9]/.test(tld)) return false
    
    return true
}

/**
 * Write domains to regima-domains.txt
 */
async function writeDomainsFile(domains) {
    const domainsPath = join(PROJECT_ROOT, 'regima-domains.txt')
    
    // Add numbering to domains
    const numberedDomains = domains.map((domain, index) => `${index + 1}.${domain}`)
    const content = numberedDomains.join('\n') + '\n'
    
    await fs.writeFile(domainsPath, content, 'utf-8')
    console.log(`✅ Updated ${domainsPath} with ${domains.length} domain combinations`)
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('🔗 Generating domain combinations...')
        
        // Read input files
        const [patterns, tlds, existingDomains] = await Promise.all([
            readPatterns(),
            readTLDs(),
            readExistingDomains()
        ])
        
        console.log(`📝 Found ${patterns.length} patterns`)
        console.log(`🌐 Found ${tlds.length} TLD extensions`)
        console.log(`📋 Found ${existingDomains.size} existing domains`)
        
        // Generate combinations
        const allCombinations = generateDomainCombinations(patterns, tlds)
        console.log(`🔄 Generated ${allCombinations.length} total combinations`)
        
        // Filter out existing domains to get only new ones
        const newDomains = allCombinations.filter(domain => !existingDomains.has(domain))
        console.log(`✨ Found ${newDomains.length} new domain combinations`)
        
        // Combine existing and new domains
        const finalDomains = [...Array.from(existingDomains), ...newDomains].sort()
        
        // Write to file
        await writeDomainsFile(finalDomains)
        
        console.log('🎉 Domain generation completed successfully!')
        console.log(`📊 Total domains in file: ${finalDomains.length}`)
        
    } catch (error) {
        console.error('❌ Failed to generate domain combinations:', error)
        process.exit(1)
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    main()
}

export { generateDomainCombinations, readPatterns, readTLDs, readExistingDomains }