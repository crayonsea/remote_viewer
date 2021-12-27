import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import path from "path-browserify";
import * as Utils from './utils';

const POINT_SIZE_SCALE = 0.01;


class Viewer {
  
  static Empty = Object.freeze( [] );

  constructor (container) {

    this.container = container;
    
    // Camera

    this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
    this.camera.up.set( 0, 0, 1 );
    this.camera.position.set( 10, 3, 1 );
    this.camera.lookAt(0, 0, 0);

    // Scene

    this.scene = new THREE.Scene();

    // Render
    
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    window.addEventListener( 'resize', this.onWindowResize );
    this.container.appendChild( this.renderer.domElement );

    // Controls

    this.controls = new OrbitControls( this.camera, this.renderer.domElement );
    this.controls.target.set( 0, 1.2, 2 );
    this.controls.update();

    // Time
    
    this.startTime = Date.now();;

    // Stats
    
    this.stats = new Stats();
    this.stats.domElement.style.cssText = 'position:absolute;bottom:0px;right:0px;';
    this.container.appendChild( this.stats.dom );

    // Setting
    
    this.params = {
      'bg_color': '#000000',
      'point_size': 5,
      'use_mesh': false,
      // info
      'model_name': '',
      'point_nums': '',
    };

    // GUI

    this.init_gui();

    // Loader

    this.ply_loader = new PLYLoader();
    // trick - mapping labels to uv -> u: gt / v: pred
    this.ply_loader.setPropertyNameMapping({
      'class': 'u',
      'preds': 'v',
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }

  init_gui() {
    
    // GUI
    
    const gui = new GUI();

    // 背景颜色
    gui.addColor(this.params, 'bg_color').onChange(value => {
      this.renderer.setClearColor(value, 1);
    });

    // 点 Size
    gui.add(this.params, 'point_size', 0.1, 10).onChange(value => {
      let objects = this.scene.children;
      for (let object of objects) {
        let material = object.material;
        material.size = value * POINT_SIZE_SCALE;
      }
    });

    // 显示 Mesh or Point
    gui.add(this.params, 'use_mesh').onChange(value => {
      console.log(value);
    });

    // folder - info
    // ---------------------------
    const folder_info = gui.addFolder( 'Info' );
    folder_info.add(this.params, 'model_name').listen().disable();
    folder_info.add(this.params, 'point_nums').listen().disable();

  }

  add_object(file_path) {

    $('#load_file_progress').show();

    this.ply_loader.load(
      `/remote_file?path=${file_path}`, 
      (geometry) => {
        // check color attr
        if (!geometry.hasAttribute('color')) {
          const positionAttribute = geometry.getAttribute('position');
          const colorAttribute = new THREE.BufferAttribute( new Float32Array( positionAttribute.array.length ), 3 );
          colorAttribute.setUsage( THREE.DynamicDrawUsage );
          geometry.setAttribute('color', colorAttribute );
        }
        // create object
        let point_size = this.params['point_size'];
        let material = new THREE.PointsMaterial( { size: point_size * POINT_SIZE_SCALE, vertexColors: true } );
        let points = new THREE.Points( geometry, material );
        points.name = file_path;
        // move to center
        let box = new THREE.Box3().setFromPoints(points);
        let center = new THREE.Vector3();
        box.getCenter( center );
        points.position.sub( center ); // center the model
        // add to scene
        this.scene.add( points );
        this.renderer.render( this.scene, this.camera );
        // progress
        $('#load_file_progress').hide(1000, () => {
          $('#load_file_progress .progress-bar').css({ width: '25%' });
        });
        // update info
        this.params['model_name'] = path.basename(points.name);
        let point_nums = points.geometry.getAttribute('position').array.length / 3;
        this.params['point_nums'] = Utils.formatNumber(point_nums);
      }, 
      (xhr) => {
        let width = Math.max(25, Math.floor((xhr.loaded / xhr.total * 100)));
        $('#load_file_progress .progress-bar').css({ width: `${width}%` });
      },
    );
  }

  update_object(file_path) {
    this.scene.clear();
    this.add_object(file_path);
  }

  animate() {
    const currentTime = Date.now();
    const time = ( currentTime - this.startTime ) / 1000;
  
    // ref: https://pretagteam.com/question/es6-class-this-in-callback-of-requestanimationframe-duplicate
    requestAnimationFrame( this.animate.bind(this) );
  
    this.stats.begin();
    this.renderer.render( this.scene, this.camera );
    this.stats.end();
  }
}

export { Viewer }
