import { copyFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'))
writeFileSync(join(dist, '.nojekyll'), '')
if (existsSync(join(dist, 'CNAME'))) rmSync(join(dist, 'CNAME'))
console.log('Prepared Pages artifacts: 404.html, .nojekyll (no CNAME)')
