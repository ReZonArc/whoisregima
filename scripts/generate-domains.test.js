import { strict as assert } from 'node:assert'
import { test, suite } from 'node:test'
import { generateDomainCombinations, readPatterns, readTLDs } from './generate-domains.js'

suite('Domain Generation Tests', () => {
    
    test('generateDomainCombinations - basic patterns', () => {
        const patterns = ['regima.*', 'regima*.*']
        const tlds = ['com', 'org']
        
        const combinations = generateDomainCombinations(patterns, tlds)
        
        // Should generate basic regima.* patterns
        assert.ok(combinations.includes('regima.com'))
        assert.ok(combinations.includes('regima.org'))
        
        // Should generate regima*.* patterns (with suffixes like zone, skin, pro)
        assert.ok(combinations.includes('regimazone.com'))
        assert.ok(combinations.includes('regimazone.org'))
        assert.ok(combinations.includes('regimaskin.com'))
        assert.ok(combinations.includes('regimapro.org'))
    })
    
    test('generateDomainCombinations - wildcard patterns', () => {
        const patterns = ['*regima.*']
        const tlds = ['com', 'org']
        
        const combinations = generateDomainCombinations(patterns, tlds)
        
        // Should generate wildcard prefix patterns
        assert.ok(combinations.includes('wwwregima.com'))
        assert.ok(combinations.includes('myregima.org'))
    })
    
    test('generateDomainCombinations - filters uncommon TLDs', () => {
        const patterns = ['regima.*']
        const tlds = ['com', 'xyz', 'random']  // xyz and random are not in common list
        
        const combinations = generateDomainCombinations(patterns, tlds)
        
        // Should include common TLD
        assert.ok(combinations.includes('regima.com'))
        
        // Should exclude uncommon TLDs
        assert.ok(!combinations.includes('regima.xyz'))
        assert.ok(!combinations.includes('regima.random'))
    })
    
    test('generateDomainCombinations - handles two-level domains', () => {
        const patterns = ['regima.*.*']
        const tlds = ['uk', 'za']
        
        const combinations = generateDomainCombinations(patterns, tlds)
        
        // Should generate two-level domains for country codes
        assert.ok(combinations.includes('regima.co.uk'))
        assert.ok(combinations.includes('regima.co.za'))
    })
    
    test('generateDomainCombinations - no duplicates', () => {
        const patterns = ['regima.*', 'regima.*']  // Duplicate patterns
        const tlds = ['com', 'com']  // Duplicate TLDs
        
        const combinations = generateDomainCombinations(patterns, tlds)
        
        // Should have no duplicates
        const unique = [...new Set(combinations)]
        assert.equal(combinations.length, unique.length)
    })
    
    test('generateDomainCombinations - returns sorted array', () => {
        const patterns = ['*regima.*', 'regima.*']
        const tlds = ['org', 'com']
        
        const combinations = generateDomainCombinations(patterns, tlds)
        
        // Should be sorted
        const sorted = [...combinations].sort()
        assert.deepEqual(combinations, sorted)
    })
    
})