if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.warn)
const install = document.createElement('button')
install.type = 'button'; install.textContent = 'Установить приложение'; install.hidden = true
document.querySelector('#settings').append(install)
let prompt
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); prompt = event; install.hidden = false })
install.addEventListener('click', async () => { if (!prompt) return; await prompt.prompt(); await prompt.userChoice; prompt = null; install.hidden = true })
window.addEventListener('appinstalled', () => { install.hidden = true })

