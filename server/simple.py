
from http.server import BaseHTTPRequestHandler
from urllib import parse
import mimetypes
import os
import os.path

def readall(socket, amt):
    recvd = b''

    while amt > 0:
        recvd += socket.read(amt)
        amt -= len(recvd)

    return recvd

def read_save_file(path):
    if path[0] == '/':
        return b''

    if path.find('..') != -1:
        return b''

    try:
        with open('../data/' + path, 'rb') as f:
            return f.read()
    except Exception as e:
        return b''

def write_save_file(path, data):
    with open('../data/' + path, 'wb') as f:
        return f.write(data)

class GetHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        parsed_path = parse.urlparse(self.path)
        content_length = int(self.headers['Content-Length'])

        print('POST')
        print(parsed_path)

        if parsed_path.query == 'save':
            path = parsed_path.path[len('/notebook/'):]

            if path[0] == '/' or path.find('..') != -1:
                self.send_response(500)
                self.send_header('Content-Type',
                                 'text/json; charset=utf-8')
                self.wfile.write(b'illegal path')
                return

            foldername = os.path.dirname(path)

            print(foldername)

            try:
                if foldername:
                    os.makedirs(foldername, exist_ok=True)

                write_save_file(path, readall(self.rfile, content_length))

                self.send_response(200)
                self.send_header('Content-Type',
                                 'text/json; charset=utf-8')
                self.end_headers()
            except Exception as e:
                print(e)
                self.send_response(500)
                self.send_header('Content-Type',
                                 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'Internal server error: ')
                self.wfile.write(str(e).encode('utf-8'))

    def do_GET(self):
        parsed_path = parse.urlparse(self.path)
        message_parts = [
            'CLIENT VALUES:',
            'client_address={} ({})'.format(
                self.client_address,
                self.address_string()),
            'command={}'.format(self.command),
            'path={}'.format(self.path),
            'real path={}'.format(parsed_path.path),
            'query={}'.format(parsed_path.query),
            'request_version={}'.format(self.request_version),
            '',
            'SERVER VALUES:',
            'server_version={}'.format(self.server_version),
            'sys_version={}'.format(self.sys_version),
            'protocol_version={}'.format(self.protocol_version),
            '',
            'HEADERS RECEIVED:',
        ]
        for name, value in sorted(self.headers.items()):
            message_parts.append(
                '{}={}'.format(name, value.rstrip())
            )
        message_parts.append('')
        message = '\r\n'.join(message_parts)

        print(parsed_path.query)

        if parsed_path.path.startswith('/notebook/'):
            try:
                with open('../client/taskified.html', 'rb') as f:
                    self.send_response(200)
                    self.send_header('Content-Type',
                                     'text/html; charset=utf-8')
                    self.end_headers()

                    savefile = read_save_file(parsed_path.path[len('/notebook/'):])
                    savefile = savefile.replace(b"\\", b"\\\\")
                    savefile = savefile.replace(b"'", b"\\'")

                    fcontents = f.read()
                    fcontents = fcontents.replace(b"var initialSavedFile__ = '';",
                                                  (b"var initialSavedFile__ = '"
                                                   + savefile
                                                   + b"';"))


                    self.wfile.write(fcontents)
            except Exception as e:
                    self.send_response(404)
                    self.send_header('Content-Type',
                                     'text/html; charset=utf-8')
                    self.end_headers()
                    self.wfile.write('404 not found')
        else:
            typeguess = mimetypes.guess_type(parsed_path.path)

            print(parsed_path)

            if typeguess[0]:
                self.send_response(200)
                self.send_header('Content-Type', typeguess[0] + '; charset=utf-8')
                self.end_headers()
                with open('../client/' + parsed_path.path[1:], 'rb') as f:
                    fcontents = f.read()
                    self.wfile.write(fcontents)
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'404 not found')

if __name__ == '__main__':
    from http.server import HTTPServer
    server = HTTPServer(('0.0.0.0', 8080), GetHandler)
    print('Starting server, use <Ctrl-C> to stop')
    server.serve_forever()

