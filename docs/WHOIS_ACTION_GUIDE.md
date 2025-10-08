# WHOIS Action Guide

This document explains the GitHub Action for automated WHOIS record management in the whoisregima repository.

## Overview

The WHOIS Action automatically monitors domain WHOIS records, tracks changes over time, and maintains historical archives. It processes domains listed in `regima-domains.txt` and stores the results in the `whois/` folder structure.

## How It Works

### Workflow Schedule
- **Daily:** Runs at 3 AM UTC every day
- **On Push:** Triggers when `regima-domains.txt` or related files change
- **Manual:** Can be triggered via workflow dispatch

### Process Flow

1. **Domain Loading:** Reads domain list from `regima-domains.txt`
2. **Record Checking:** Compares current WHOIS data with existing records
3. **Change Detection:** Identifies significant changes in key WHOIS fields
4. **Archival:** Moves old records to `whois/archive/` with timestamps
5. **Update:** Saves new records in JSON and Markdown formats
6. **Summary:** Generates comprehensive report in `whois/regima.md`

### File Structure

```
whois/
├── json/           # Machine-readable WHOIS data
│   └── domain.com.json
├── md/             # Human-readable summaries  
│   └── domain.com.md
├── archive/        # Historical records
│   └── domain.com-2023-10-08T12-00-00-000Z.json
├── regima.md       # Summary report
└── use-this-folder.md
```

## Key Features

### Change Detection
The action monitors these critical WHOIS fields:
- Expiration dates
- Registrar information
- Name servers
- Domain status
- Registrant details
- Last updated timestamps

### Rate Limiting
- 2-second delays between domain queries
- 10-second timeout per WHOIS lookup
- Respectful to WHOIS server limits

### Error Handling
- Graceful failure for unavailable domains
- Detailed error logging
- Statistics tracking for monitoring

## Configuration

### Adding Domains
Add domains to `regima-domains.txt` in the format:
```
1.example.com
2.another-domain.net  
3.my-site.org
```

### Manual Trigger
Run the action manually from GitHub Actions tab or via API:
```bash
gh workflow run whois-checker.yml
```

## Output Files

### JSON Format (`whois/json/`)
Machine-readable format with complete WHOIS data:
```json
{
  "domain": "example.com",
  "lastUpdated": "2023-10-08T12:00:00.000Z",
  "whoisData": {
    "Registry Expiry Date": "2024-10-08T12:00:00Z",
    "Registrar": "Example Registrar Inc.",
    // ... full WHOIS data
  },
  "metadata": {
    "checkedAt": "2023-10-08T12:00:00.000Z",
    "source": "whois-checker-action"
  }
}
```

### Markdown Format (`whois/md/`)
Human-readable summaries with key information formatted for easy reading.

### Archive Format (`whois/archive/`)
Timestamped historical records when changes are detected.

## Monitoring

### GitHub Action Summary
Each run produces a summary showing:
- Total domains processed
- New records added
- Records updated
- Historical records archived
- Error count

### Summary Report
The `whois/regima.md` file provides:
- Complete statistics
- List of tracked domains  
- Links to individual records
- Generation timestamp

## Best Practices

1. **Domain Management:** Keep `regima-domains.txt` organized and up-to-date
2. **Monitoring:** Check Action runs for errors or failures
3. **Archive Cleanup:** Periodically clean old archive files if needed
4. **Rate Limits:** Be mindful of WHOIS server policies

## Troubleshooting

### Common Issues
- **Network timeouts:** WHOIS servers may be slow or unavailable
- **Rate limiting:** Too many domains may trigger server limits  
- **Invalid domains:** Non-existent domains will log errors

### Logs
Check GitHub Action logs for detailed error messages and processing information.

## Integration

### With RegimaManager
The action uses the existing `RegimaManager` class for consistent WHOIS handling and data formatting.

### With Existing Workflows
Coordinates with the domain generation workflow to process new domains automatically.