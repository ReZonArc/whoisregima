#!/usr/bin/env node

/**
 * Script to update TLD extensions from IANA's official list
 */

import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

/**
 * Fallback TLD list (common ones) for when fetch fails
 */
const FALLBACK_TLDS = `# Common TLD extensions fallback
COM
ORG
NET
EDU
GOV
MIL
INT
AERO
BIZ
COOP
INFO
MUSEUM
NAME
PRO
TRAVEL
XXX
JOBS
MOBI
TEL
POST
AC
AD
AE
AF
AG
AI
AL
AM
AN
AO
AQ
AR
AS
AT
AU
AW
AX
AZ
BA
BB
BD
BE
BF
BG
BH
BI
BJ
BM
BN
BO
BR
BS
BT
BV
BW
BY
BZ
CA
CC
CD
CF
CG
CH
CI
CK
CL
CM
CN
CO
CR
CU
CV
CW
CX
CY
CZ
DE
DJ
DK
DM
DO
DZ
EC
EE
EG
ER
ES
ET
EU
FI
FJ
FK
FM
FO
FR
GA
GB
GD
GE
GF
GG
GH
GI
GL
GM
GN
GP
GQ
GR
GS
GT
GU
GW
GY
HK
HM
HN
HR
HT
HU
ID
IE
IL
IM
IN
IO
IQ
IR
IS
IT
JE
JM
JO
JP
KE
KG
KH
KI
KM
KN
KP
KR
KW
KY
KZ
LA
LB
LC
LI
LK
LR
LS
LT
LU
LV
LY
MA
MC
MD
ME
MG
MH
MK
ML
MM
MN
MO
MP
MQ
MR
MS
MT
MU
MV
MW
MX
MY
MZ
NA
NC
NE
NF
NG
NI
NL
NO
NP
NR
NU
NZ
OM
PA
PE
PF
PG
PH
PK
PL
PM
PN
PR
PS
PT
PW
PY
QA
RE
RO
RS
RU
RW
SA
SB
SC
SD
SE
SG
SH
SI
SJ
SK
SL
SM
SN
SO
SR
SS
ST
SU
SV
SX
SY
SZ
TC
TD
TF
TG
TH
TJ
TK
TL
TM
TN
TO
TR
TT
TV
TW
TZ
UA
UG
UK
US
UY
UZ
VA
VC
VE
VG
VI
VN
VU
WF
WS
YE
YT
ZA
ZM
ZW
ZONE
ZIP
WORK
WIN
WIKI
WEBSITE`

/**
 * Fetch the official TLD list from IANA
 */
async function fetchTLDList() {
    try {
        console.log('Fetching official TLD list from IANA...')
        const response = await fetch('https://data.iana.org/TLD/tlds-alpha-by-domain.txt')
        
        if (!response.ok) {
            throw new Error(`Failed to fetch TLD list: ${response.status} ${response.statusText}`)
        }
        
        const text = await response.text()
        return text
    } catch (error) {
        console.warn('Failed to fetch TLD list from IANA, using fallback list:', error.message)
        return FALLBACK_TLDS
    }
}

/**
 * Parse and clean the TLD list
 */
function parseTLDList(rawText) {
    const lines = rawText.split('\n')
    const tlds = []
    
    for (const line of lines) {
        const trimmed = line.trim()
        // Skip empty lines and comments (lines starting with #)
        if (trimmed && !trimmed.startsWith('#')) {
            // Convert to lowercase and add dot prefix
            tlds.push('.' + trimmed.toLowerCase())
        }
    }
    
    return tlds.sort()
}

/**
 * Write TLD list to file
 */
async function writeTLDFile(tlds) {
    const tldFilePath = join(PROJECT_ROOT, 'tld-extensions.txt')
    const content = tlds.join('\n') + '\n'
    
    await fs.writeFile(tldFilePath, content, 'utf-8')
    console.log(`✅ Updated ${tldFilePath} with ${tlds.length} TLD extensions`)
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('🌐 Updating TLD extensions...')
        
        const rawTLDText = await fetchTLDList()
        const tlds = parseTLDList(rawTLDText)
        
        console.log(`📝 Found ${tlds.length} TLD extensions`)
        console.log('First few TLDs:', tlds.slice(0, 10))
        console.log('Last few TLDs:', tlds.slice(-10))
        
        await writeTLDFile(tlds)
        
        console.log('🎉 TLD update completed successfully!')
        
    } catch (error) {
        console.error('❌ Failed to update TLD extensions:', error)
        process.exit(1)
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    main()
}

export { fetchTLDList, parseTLDList, writeTLDFile }