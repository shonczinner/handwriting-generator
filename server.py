import http.server
import socketserver
import mimetypes
import os

PORT = 8000

# Ensure .js files are served with application/javascript MIME type
mimetypes.add_type('application/javascript', '.js')

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers if you want to allow cross-origin requests (optional)
        # self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def guess_type(self, path):
        # Override to fix MIME type for .js and .json files (optional for JSON)
        mime_type, _ = mimetypes.guess_type(path)
        if path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.json'):
            return 'application/json'
        return mime_type or 'application/octet-stream'


def run():
    handler = CustomHTTPRequestHandler
    os.chdir(os.path.dirname(os.path.abspath(__file__)))  # serve from current dir
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()

if __name__ == "__main__":
    run()
