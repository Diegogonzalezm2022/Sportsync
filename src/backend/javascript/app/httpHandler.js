const http = require('http')

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Hello World')
})

server.listen(8000, 'src-backend', () =>{
    console.log('Server is running on localhost:' + 8000)
})