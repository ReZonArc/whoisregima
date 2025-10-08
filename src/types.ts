export interface DomainWhoisData {
	'Domain Name'?: string
	'Domain Status'?: string[]
	'Name Server'?: string[]
	text?: string[]
	[key: string]: string | string[]
}

export interface DomainWhois {
	[key: string]: DomainWhoisData
}

export interface WhoisDataGroup {
	[key: string]: string
}

export interface WhoisData {
	[key: string]: string | string[] | WhoisDataGroup | { [key: string]: WhoisDataGroup } | undefined
	contacts?: { [key: string]: WhoisDataGroup }
	__comments: string[]
	__raw: string
}

/**
 * TLD Whois response, from iana.org
 */
export interface TldWhoisResponse {
	tld: string
	organisation?: WhoisDataGroup
	contacts: WhoisDataGroup[]
	nserver: string[]
	'ds-rdata'?: string
	whois?: string
	status: 'ACTIVE' | 'FORMER'
	remarks: string
	created: string
	changed: string
	source: string
	__comments: string[]
	__raw: string
}

/**
 * Options for querying Domain Name whois
 */
export interface DomainWhoisOptions {
	host?: string
	timeout?: number
	follow?: 1 | 2
	raw?: boolean
	ignorePrivacy?: boolean
	whoisQuery?: (host: string, query: string, timeout?: number) => Promise<string>
}

/**
 * Regima domain entry with WHOIS data and metadata
 */
export interface RegimaDomainEntry {
	domain: string
	addedDate: string
	lastUpdated: string
	whoisData: DomainWhoisData
	metadata?: {
		tags?: string[]
		notes?: string
		priority?: 'low' | 'medium' | 'high'
	}
}

/**
 * Grouped regima domains by specific metrics
 */
export interface RegimaGroupedDomains {
	[groupKey: string]: RegimaDomainEntry[]
}

/**
 * Regima domain grouping options
 */
export interface RegimaGroupingOptions {
	groupBy: 'registrar' | 'tld' | 'createdYear' | 'createdMonth' | 'expiryYear' | 'expiryMonth' | 'nameservers' | 'status'
	includeEmpty?: boolean
}

/**
 * Regima domain list with grouping and filtering capabilities
 */
export interface RegimaDomainList {
	domains: RegimaDomainEntry[]
	lastUpdated: string
	totalDomains: number
}
