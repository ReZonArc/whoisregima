import { promises as fs } from 'node:fs'
import { whoisDomain, firstResult } from './whoiser.ts'
import type { 
	RegimaDomainEntry, 
	RegimaGroupedDomains, 
	RegimaGroupingOptions, 
	RegimaDomainList,
	DomainWhoisOptions 
} from './types.ts'

/**
 * RegimaManager - Manages a list of regima domains with grouping and persistence
 */
export class RegimaManager {
	private domains: RegimaDomainEntry[] = []
	private dataFile: string
	
	constructor(dataFile: string = 'regima-domains.json') {
		this.dataFile = dataFile
	}

	/**
	 * Load domains from persistent storage
	 */
	async loadDomains(): Promise<void> {
		try {
			const data = await fs.readFile(this.dataFile, 'utf-8')
			const domainList: RegimaDomainList = JSON.parse(data)
			this.domains = domainList.domains || []
		} catch (error) {
			// File doesn't exist or is invalid, start with empty list
			this.domains = []
		}
	}

	/**
	 * Save domains to persistent storage
	 */
	async saveDomains(): Promise<void> {
		const domainList: RegimaDomainList = {
			domains: this.domains,
			lastUpdated: new Date().toISOString(),
			totalDomains: this.domains.length
		}
		await fs.writeFile(this.dataFile, JSON.stringify(domainList, null, 2))
	}

	/**
	 * Add a new domain to the regima list
	 */
	async addDomain(domain: string, options?: DomainWhoisOptions & { 
		tags?: string[], 
		notes?: string, 
		priority?: 'low' | 'medium' | 'high' 
	}): Promise<RegimaDomainEntry> {
		// Check if domain already exists
		const existingIndex = this.domains.findIndex(d => d.domain.toLowerCase() === domain.toLowerCase())
		
		// Get WHOIS data
		const whoisData = await whoisDomain(domain, options)
		const firstWhoisResult = firstResult(whoisData)
		
		const entry: RegimaDomainEntry = {
			domain: domain.toLowerCase(),
			addedDate: existingIndex >= 0 ? this.domains[existingIndex].addedDate : new Date().toISOString(),
			lastUpdated: new Date().toISOString(),
			whoisData: firstWhoisResult,
			metadata: {
				tags: options?.tags || [],
				notes: options?.notes || '',
				priority: options?.priority || 'medium'
			}
		}

		if (existingIndex >= 0) {
			// Update existing domain
			this.domains[existingIndex] = entry
		} else {
			// Add new domain
			this.domains.push(entry)
		}

		await this.saveDomains()
		return entry
	}

	/**
	 * Remove a domain from the regima list
	 */
	async removeDomain(domain: string): Promise<boolean> {
		const initialLength = this.domains.length
		this.domains = this.domains.filter(d => d.domain.toLowerCase() !== domain.toLowerCase())
		
		if (this.domains.length < initialLength) {
			await this.saveDomains()
			return true
		}
		return false
	}

	/**
	 * Get all domains in the regima list
	 */
	getDomains(): RegimaDomainEntry[] {
		return [...this.domains]
	}

	/**
	 * Group domains according to specified metrics
	 */
	groupDomains(options: RegimaGroupingOptions): RegimaGroupedDomains {
		const grouped: RegimaGroupedDomains = {}

		for (const domain of this.domains) {
			let groupKey: string

			switch (options.groupBy) {
				case 'registrar':
					const registrar = domain.whoisData['Registrar']
					groupKey = (typeof registrar === 'string' ? registrar : 'Unknown Registrar')
					break
				case 'tld':
					groupKey = domain.domain.split('.').pop()?.toUpperCase() || 'Unknown TLD'
					break
				case 'createdYear':
					const createdDate = domain.whoisData['Created Date']
					if (typeof createdDate === 'string') {
						groupKey = new Date(createdDate).getFullYear().toString()
					} else {
						groupKey = 'Unknown Year'
					}
					break
				case 'createdMonth':
					const createdDateMonth = domain.whoisData['Created Date']
					if (typeof createdDateMonth === 'string') {
						const date = new Date(createdDateMonth)
						groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
					} else {
						groupKey = 'Unknown Month'
					}
					break
				case 'expiryYear':
					const expiryDate = domain.whoisData['Expiry Date']
					if (typeof expiryDate === 'string') {
						groupKey = new Date(expiryDate).getFullYear().toString()
					} else {
						groupKey = 'Unknown Year'
					}
					break
				case 'expiryMonth':
					const expiryDateMonth = domain.whoisData['Expiry Date']
					if (typeof expiryDateMonth === 'string') {
						const date = new Date(expiryDateMonth)
						groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
					} else {
						groupKey = 'Unknown Month'
					}
					break
				case 'nameservers':
					const nameservers = domain.whoisData['Name Server']
					if (Array.isArray(nameservers) && nameservers.length > 0) {
						// Group by primary nameserver or nameserver pattern
						groupKey = nameservers[0] || 'Unknown Nameserver'
					} else {
						groupKey = 'No Nameservers'
					}
					break
				case 'status':
					const status = domain.whoisData['Domain Status']
					if (Array.isArray(status) && status.length > 0) {
						groupKey = status[0] || 'Unknown Status'
					} else {
						groupKey = 'No Status'
					}
					break
				default:
					groupKey = 'Unknown'
			}

			if (!grouped[groupKey]) {
				grouped[groupKey] = []
			}
			grouped[groupKey].push(domain)
		}

		// Sort groups by key and optionally remove empty groups
		const sortedGrouped: RegimaGroupedDomains = {}
		const sortedKeys = Object.keys(grouped).sort()
		
		for (const key of sortedKeys) {
			if (options.includeEmpty || grouped[key].length > 0) {
				sortedGrouped[key] = grouped[key]
			}
		}

		return sortedGrouped
	}

	/**
	 * Update WHOIS data for all domains
	 */
	async updateAllDomains(options?: DomainWhoisOptions): Promise<void> {
		console.log(`Updating ${this.domains.length} domains...`)
		
		for (let i = 0; i < this.domains.length; i++) {
			const domain = this.domains[i]
			try {
				console.log(`Updating ${domain.domain} (${i + 1}/${this.domains.length})`)
				const whoisData = await whoisDomain(domain.domain, options)
				const firstWhoisResult = firstResult(whoisData)
				
				this.domains[i] = {
					...domain,
					lastUpdated: new Date().toISOString(),
					whoisData: firstWhoisResult
				}
				
				// Add small delay to avoid overwhelming WHOIS servers
				await new Promise(resolve => setTimeout(resolve, 1000))
			} catch (error) {
				console.error(`Failed to update ${domain.domain}:`, error)
			}
		}
		
		await this.saveDomains()
		console.log('Update complete!')
	}

	/**
	 * Get statistics about the regima domain list
	 */
	getStats(): {
		totalDomains: number
		byRegistrar: { [key: string]: number }
		byTld: { [key: string]: number }
		byStatus: { [key: string]: number }
		oldestDomain?: RegimaDomainEntry
		newestDomain?: RegimaDomainEntry
	} {
		const stats = {
			totalDomains: this.domains.length,
			byRegistrar: {} as { [key: string]: number },
			byTld: {} as { [key: string]: number },
			byStatus: {} as { [key: string]: number },
			oldestDomain: undefined as RegimaDomainEntry | undefined,
			newestDomain: undefined as RegimaDomainEntry | undefined
		}

		let oldestDate = new Date()
		let newestDate = new Date(0)

		for (const domain of this.domains) {
			// Count by registrar
			const registrarData = domain.whoisData['Registrar']
			const registrar = typeof registrarData === 'string' ? registrarData : 'Unknown'
			stats.byRegistrar[registrar] = (stats.byRegistrar[registrar] || 0) + 1

			// Count by TLD
			const tld = domain.domain.split('.').pop()?.toUpperCase() || 'Unknown'
			stats.byTld[tld] = (stats.byTld[tld] || 0) + 1

			// Count by status
			const status = Array.isArray(domain.whoisData['Domain Status']) && domain.whoisData['Domain Status'].length > 0
				? domain.whoisData['Domain Status'][0]
				: 'Unknown'
			stats.byStatus[status] = (stats.byStatus[status] || 0) + 1

			// Find oldest and newest domains
			const addedDate = new Date(domain.addedDate)
			if (addedDate < oldestDate) {
				oldestDate = addedDate
				stats.oldestDomain = domain
			}
			if (addedDate > newestDate) {
				newestDate = addedDate
				stats.newestDomain = domain
			}
		}

		return stats
	}
}