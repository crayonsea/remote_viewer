//////////////////////////////////////////////////
// Show/Hide FileTree - Button
//////////////////////////////////////////////////

$('#filetree_switch').on("click", function(){
  $(this).toggleClass("click");
  $('.sidebar').toggleClass("show");
});

//////////////////////////////////////////////////
// InfoText - Text
//////////////////////////////////////////////////

const info_text = $('#directory_info');

//////////////////////////////////////////////////
// EventEmitter
//////////////////////////////////////////////////

import { EventEmitter } from "events";

class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();
myEmitter.on('updateObject', (new_obj_path) => {
  console.log('update obj!', new_obj_path);
  viewer.update_object(new_obj_path);
});

//////////////////////////////////////////////////
// FileTree
//////////////////////////////////////////////////

import { FileTree } from './filetree';

// const root_dir = 'resources';
const root_dir = './resources';
const filetree = $('#filetree');

FileTree.setEventEmitter(myEmitter);

$.getJSON(`remote_directory?path=${root_dir}`).then(function(json_data) {
  // console.log(json_data);
  FileTree.init(filetree, json_data, info_text);
  FileTree.watch(filetree);
});

//////////////////////////////////////////////////
// Logger
//////////////////////////////////////////////////

import { Toast } from "bootstrap";

function show_logger(log_text='') {
  let toastLive = $('#liveToast')
  let toast = new Toast(toastLive);
  let toast_msg = $('#liveToast .toast-msg');
  toast_msg.text(log_text);
  toast.show();
}

show_logger();

//////////////////////////////////////////////////
// SET_ROOT - Input
//////////////////////////////////////////////////

$('#input_set_root').on('keypress', function (e) {
  if(e.key === 'Enter'){
    //Disable textbox to prevent multiple submit
    $(this).attr("disabled", "disabled");
    
    let pre_text = info_text.text();
    info_text.text("LOADING...");
    
    // 查询目录结构
    let root_dir = $(this).val();
    $.getJSON(`remote_directory?path=${root_dir}`).then(function(json_data) {
      console.log(json_data);
      FileTree.init(filetree, json_data, info_text);
    }).fail(function(){
      alert(`路径 [${root_dir}] 不存在`);
      info_text.text(pre_text);
    });

    //Enable the textbox again if needed.
    $(this).removeAttr("disabled");
  }
});

//////////////////////////////////////////////////
// ProcessBar
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// 3D Viewer
//////////////////////////////////////////////////

// import * as viewer from "./viewer";
// const container = document.getElementById( 'container' );
// viewer.init(container);
// viewer.animate();

const defaule_model_path = 'resources/Area_2_office_1.ply';

import { Viewer } from "./viewer";
const viewer = new Viewer(container);
viewer.add_object(defaule_model_path);
viewer.animate();
