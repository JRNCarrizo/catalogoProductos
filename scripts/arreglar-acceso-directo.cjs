const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const ico = path.join(__dirname, '..', 'admin', 'icon.ico')
const freshExe = path.join(
  __dirname,
  '..',
  'release',
  'win-unpacked',
  'Vinos de Remate Panel.exe',
)

const posiblesExe = [
  path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Vinos de Remate Panel', 'Vinos de Remate Panel.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Vinos de Remate Panel', 'Vinos de Remate Panel.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'vinos-de-remate-panel', 'Vinos de Remate Panel.exe'),
  freshExe,
]

const exe = posiblesExe.find((p) => fs.existsSync(p))
console.log('EXE encontrado:', exe || '(ninguno)')

const escritorios = [
  path.join(os.homedir(), 'Desktop', 'Vinos de Remate Panel.lnk'),
  path.join(os.homedir(), 'Escritorio', 'Vinos de Remate Panel.lnk'),
]

const destinoLnk =
  escritorios.find((p) => fs.existsSync(path.dirname(p))) ||
  path.join(os.homedir(), 'Desktop', 'Vinos de Remate Panel.lnk')

const target = exe || freshExe
const iconPath = fs.existsSync(ico) ? ico : target

const ps = `
$ErrorActionPreference = 'Stop'
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut(${JSON.stringify(destinoLnk)})
$Shortcut.TargetPath = ${JSON.stringify(target)}
$Shortcut.WorkingDirectory = ${JSON.stringify(path.dirname(target))}
$Shortcut.IconLocation = ${JSON.stringify(iconPath + ',0')}
$Shortcut.Description = 'Panel de carga · Vinos de Remate'
$Shortcut.Save()
Write-Output ('OK acceso directo -> ' + $Shortcut.TargetPath)
Write-Output ('Icono -> ' + $Shortcut.IconLocation)
`

const ps1 = path.join(os.tmpdir(), 'fix-vinos-shortcut.ps1')
fs.writeFileSync(ps1, ps, 'utf8')
execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], {
  stdio: 'inherit',
})

console.log('Listo. Si en Escritorio público queda el viejo, borralo a mano (pide admin).')
console.log('Usá el acceso directo nuevo del escritorio del usuario.')
