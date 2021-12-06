// Bootstrap 5
import "bootstrap/dist/css/bootstrap.min.css";

import 'bootstrap/js/dist/toast';

// Font Awesome 5 (Free)
import '@fortawesome/fontawesome-free/js/fontawesome'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/regular'
import '@fortawesome/fontawesome-free/js/brands'

// self define
import "./filetree.css";

// path
import "path-browserify";

// jquery
import jQuery from "jquery";
import path from "path-browserify";
window.$ = window.jQuery = jQuery;

// event
// import {myEmitter} from "./viewer";

// 
// FileTree
// 
class FileTree {
  constructor () {}

  static eventEmitter = null;

  static setEventEmitter(emitter) {
    this.eventEmitter = emitter;
  }

  static init(filetree, json_data, info_text) {
    FileTree.clear(filetree);
    FileTree.update_node(filetree, json_data);
    FileTree.update_info_text(info_text, json_data);
  }

  static update_info_text(info_text, json_data) {
    let hostname = json_data['hostname'];
    let cur_dir = json_data['cur_dir'];
    info_text.text(`[${hostname}] ${path.basename(cur_dir)}`);
    info_text.attr('title', `[${hostname}] ${cur_dir}`)
  }

  static clear(cur_node) {
    cur_node.children().remove();
  }

  static clear_node(cur_node) {
    cur_node.children().remove();
  }

  static update_node(cur_node, json_data) {
    let files = json_data['files'];
    for (const file of files) {
      // console.log(file);
      let node = FileTree.create_node(file);
      cur_node.append(node);
    }
  }

  static create_node(file) {
    let id = file['id'];
    let type = file['type'];
    let text = file['text'];
    let size = file['size'];
    let children = file['children'];
    
    let cur_node = $(`<li></li>`);
    let cur_info = $(`<a href="#" title="${id}" data-path="${id}" data-size="${size}"> ${text}</a>`);
    if (type == 'folder') {
      cur_node.addClass('folder');
      let icon = $(`<div style="font-size:1.2rem;display:inline;"><i class="fas fa-fw fa-folder"></i></div>`);
      cur_info.prepend(icon);
    } else if (type == 'file') {
      cur_node.addClass('file');
      let icon = $(`<div style="font-size:1.2rem;display:inline;"><i class="fas fa-fw fa-file"></i></div>`);
      cur_info.prepend(icon);
    }
    cur_node.append(cur_info);
    
    if (children && children.length != 0) {
      let sub_filetree = $('<ul></ul>');
      cur_node.append(sub_filetree);
      for (let sub_file of children) {
        let sub_node = FileTree.create_node(sub_file);
        sub_filetree.append(sub_node);
      }
    }

    return cur_node;
  }

  static watch(filetree) {
    console.log('watching change');

    // 单击展开文件夹
    // $(`${this.filetree_selector}`).on("click", "[data-path]", function(){
    filetree.on("click", "[data-path]", function(){
      // 跳过文件
      if ($(this).parent().hasClass('file')) { return; }

      // 跳过正在执行
      if ($(this).data("executing")) return;

      // 开始执行 - 直至执行结束才会再一次触发
      $(this).data("executing", true);
      
      // 显示文件夹信息
      if ($(this).data["state"] != "open") {
        let folder_path = $(this).data('path');
        let cur_node = $(this).parent();
        let sub_filetree = $(this).siblings('ul').length? $(this).siblings('ul'): $('<ul></ul>');
        let that = this;
        $.getJSON(`remote_directory?path=${folder_path}`).then(function(json_data) {
          // console.log(json_data);
          FileTree.clear_node(sub_filetree);
          FileTree.update_node(sub_filetree, json_data);
          cur_node.append(sub_filetree);
          sub_filetree.toggleClass('show');
          // 执行完毕
          $(that).data("state", "open");
          $(that).removeData("executing");
        });  
      }

      // 更新图标
      let icon = $(this).find('svg');
      let icon_fa_icon = icon.attr('data-icon');
      if (icon_fa_icon === "folder") {
        icon.attr('data-icon', 'folder-open');
      } else {
        icon.attr('data-icon', 'folder');
      }
    });

    // 双击打开文件
    // let self = this;
    // $(`${this.filetree_selector}`).on("dblclick", "[data-path]", function(){
    filetree.on("dblclick", "[data-path]", function(){
      // 跳过文件夹
      if ($(this).parent().hasClass('folder')) { return; }

      // 跳过正在执行
      if ($(this).data("executing")) return;

      // 开始执行
      $(this).data("executing", true);
      
      // 显示打开文件
      filetree.find('li').removeClass('active');
      // $(`${self.filetree_selector} li`).removeClass('active');
      $(this).parent().addClass('active');
      // 打开文件

      // console.log($(this).text());
      let new_obj_path = $(this).data('path')
      console.log($(this).data('path'))
      FileTree.eventEmitter.emit('updateObject', new_obj_path);

      // myEmitter.emit('updateObject', new_obj_path);

      // 执行完毕
      $(this).removeData("executing");
    });
  }
}

export { FileTree }
