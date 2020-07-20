
from http.server import BaseHTTPRequestHandler
from urllib import parse
import mimetypes

class GetHandler(BaseHTTPRequestHandler):
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
        self.send_response(200)

        if parsed_path.path.startswith('/notebook/'):
            self.send_header('Content-Type',
                             'text/html; charset=utf-8')
            self.end_headers()
            with open('../client/taskified.html', 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_header('Content-Type', mimetypes.guess_type(parsed_path.path)[0] + '; charset=utf-8')
            self.end_headers()
            with open('../client/' + parsed_path.path[1:], 'rb') as f:
                self.wfile.write(f.read())

if __name__ == '__main__':
    from http.server import HTTPServer
    server = HTTPServer(('0.0.0.0', 8080), GetHandler)
    print('Starting server, use <Ctrl-C> to stop')
    server.serve_forever()

