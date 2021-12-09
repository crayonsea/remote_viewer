import os
from flask.helpers import send_file
from flask import Flask, render_template, request, jsonify, abort

ROOT_PATH = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__, 
            root_path=ROOT_PATH, 
            template_folder='static/src',
            static_folder='static',
            static_url_path="",)


@app.route("/")
def main_page():
    return render_template('index.html')


@app.route("/load_remote_file")
def load_remote_file():
    default_path = '/home/ljw/workspace/remote_viewer/resources/Lucy100k.ply'
    pc_path = request.args.get('path', default_path)
    return send_file(pc_path, mimetype='application/octet-stream', as_attachment=True)


def get_directory_info(dir_path):
    ''' 获取文件夹下的目录结构, 并返回 json 格式的 list '''
    data = os.popen(f'ls {dir_path} -all -h --group-directories-first').read()
    data = data.splitlines()
    # ['drwxrwxr-x', '2', 'ljw', 'ljw', '4.0K', 'Nov', '30', '21:35', 'temp']
    files = []
    for d in data[3:]:
        info = d.split()
        files.append({
            'id': os.path.join(dir_path, info[-1]),
            'text': info[-1],
            'type': 'folder' if info[0][0] == 'd' else 'file',
            'size': info[4],
            'state': {},
            'children': [],})
    return files


@app.route('/remote_directory')
def remote_directory():
    '''GET: 获取指定目录下的子文件及文件夹信息
    params: path
    '''
    dir_path = request.args.get('path', '.')
    dir_path = os.path.abspath(dir_path)

    if os.path.isdir(dir_path):
        hostname = os.uname()[1]
        files = get_directory_info(dir_path)
        return jsonify(cur_dir=dir_path, hostname=hostname, files=files), 200
    else:
        abort(404)


@app.route("/remote_file")
def remote_file():
    '''GET: 获取指定目录下的文件
    params: path
    '''
    file_path = request.args.get('path', '')
    file_path = os.path.abspath(file_path)
    
    if os.path.isfile(file_path):
        suffix = os.path.splitext(file_path)[1]
        if suffix not in ['.ply', '.ptx', '.off']:
            abort(403)
        return send_file(file_path, mimetype='application/octet-stream', as_attachment=True), 200
    else:
        abort(404)


if __name__ == '__main__':    
    # - 主页面
    # /
    # - 获取文件
    # remote_file [GET]
    # - 获取目录结构
    # remote_directory [GET] param='direcory'

    # [DEVELOP]
    # app.run(host='0.0.0.0', debug=True, port=2666)

    # [PRODUCTION]
    from waitress import serve
    serve(app, host="0.0.0.0", port=2666)