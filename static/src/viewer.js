import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import path from "path-browserify";
import * as Utils from './utils';
import { dataset_semseg } from './dataset_semseg';

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
      'bg_color': '#555555',
      'point_size': 5,
      'use_mesh': false,
      // info
      'model_name': '',
      'point_nums': '',
      // semantic dataset
      'dataset': '---',
      'attr_gt': 'class', 
      'attr_pred' : 'preds',
      'show_rgb': () => { this.update_object_color_type('rgb'); },
      'show_gt': () => { this.update_object_color_type('gt'); },
      'show_pred': () => { this.update_object_color_type('pred'); },
      // semantic metrics
      'acc': '---',
      'miou': '---',
    };

    // store <label:color> mapping
    /**
     * label_name : label_color(hex)
     */
    this.params_semseg = {};

    this.renderer.setClearColor(this.params['bg_color']);

    // GUI

    this.init_gui();
    this.guis = {};

    // Loader

    this.ply_loader = new PLYLoader();
    this.loader_update_mapping();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }

  // ---------------------------------------------
  // GUI
  // ---------------------------------------------

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

    // folder - semseg label
    // ---------------------------
    const folder_semseg = gui.addFolder( 'Semantic' );
    let attr_control_gt = folder_semseg.add(this.params, 'attr_gt').onChange(value => {
      console.log('attr_gt', ':', value);
    });
    let attr_control_pred = folder_semseg.add(this.params, 'attr_pred').onChange(value => {
      console.log('attr_pred', ':', value);
    });
    folder_semseg.add(this.params, 'show_rgb');
    folder_semseg.add(this.params, 'show_gt');
    folder_semseg.add(this.params, 'show_pred');
    folder_semseg.add(this.params, 'acc').listen().disable();
    folder_semseg.add(this.params, 'miou').listen().disable();
    folder_semseg.add(this.params, 'dataset', ['---', 'scannet', 's3dis']).onChange(value => {
      console.log(value);
      if (value == '---') {
        attr_control_gt.enable();
        attr_control_pred.enable();
        if (this.guis['semantic'] !== undefined) { this.guis['semantic'].destroy(); }
      } else {
        attr_control_gt.disable();
        attr_control_pred.disable();
        if (this.guis['semantic'] !== undefined) { this.guis['semantic'].destroy(); }
        // create setting gui 
        const gui_semseg = new GUI( { title : 'Semantic Mapping', parent : gui} );
        // - choose dataset type
        this.params_semseg = {};
        const labels = dataset_semseg[value]['labels'];
        const colors = dataset_semseg[value]['colors'];
        for (let i = 0; i < labels.length; i++) {
          this.params_semseg[labels[i]] = colors[i];
        }
        for (let key in this.params_semseg) {
          gui_semseg.addColor(this.params_semseg, key);
        }
        gui_semseg.onChange(event => {
          console.log(event.property, event.value);
          let objects = this.scene.children;
          for (let object of objects) {
            this.update_color(object.geometry, event.property, event.value, this.use_gt);
          }
        });
        this.guis['semantic'] = gui_semseg;
        // init semseg
        for (let object of this.scene.children) {
          this.geometry_use_sem(object.geometry);
        }
        this.use_gt = false;
        this.update_object_metrics();
      }
    });
  }

  // ---------------------------------------------
  // Scene
  // ---------------------------------------------

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
        // backup rgb
        geometry.setAttribute('color_rgb', geometry.getAttribute('color').clone());
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
        this.update_object_metrics();
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

  update_object_metrics() {
    let objects = this.scene.children;
    if (objects.length == 0) {
      this.params['acc'] = '---';
      this.params['miou'] = '---';
      return;
    }

    let geometry = objects[0].geometry;
    if (!geometry.hasAttribute('uv')) {
      this.params['acc'] = '---';
      this.params['miou'] = '---';
      return;
    }

    const uvAttribute = geometry.getAttribute('uv');
    const uvArray = uvAttribute.array;

    // acc
    let acc;
    if (this.params['dataset'] == 's3dis') {
      acc = Utils.metrics_acc(uvArray);
      acc = acc.toFixed(2) + '%';
    } else if (this.params['dataset'] == 'scannet') {
      acc = Utils.metrics_acc(uvArray, 0);
      acc = acc.toFixed(2) + '%';
    } else {
      acc = '---';
    }
    this.params['acc'] = acc;

  }

  update_object_color_type(type) {
    let objects = this.scene.children;
    for (let object of objects) {
      if (type == 'rgb') {
        console.log('show rgb');
        this.geometry_use_rgb(object.geometry);
      } else if (type == 'gt') {
        console.log('show gt');
        this.geometry_use_sem(object.geometry, true);
      } else if (type == 'pred') {
        console.log('show pred');
        this.geometry_use_sem(object.geometry, false);
      }
    }
  }

  // ---------------------------------------------
  // Geometry
  // ---------------------------------------------
  
  update_color(geometry, label_name, color_value, use_gt=false) {
    if (!geometry.hasAttribute('uv')) return;

    const colorAttribute = geometry.getAttribute('color');
    const uvAttribute = geometry.getAttribute('uv');

    const count = colorAttribute.count;
    const color = new THREE.Color(color_value);
    const name2class = dataset_semseg[this.params['dataset']]['name2class'];
    const choose_class = name2class[label_name];

    for (let i = 0; i < count; i++) {
      const label_class = use_gt? uvAttribute.getX(i): uvAttribute.getY(i);
      if (label_class != choose_class) continue;
      colorAttribute.setXYZ(i, color.r, color.g, color.b);
    }
    colorAttribute.needsUpdate = true;
  }

  geometry_use_rgb(geometry) {
    const colorAttribute = geometry.getAttribute('color');
    const colorRGBAttribute = geometry.getAttribute('color_rgb');
    colorAttribute.copy(colorRGBAttribute);
    colorAttribute.needsUpdate = true;
  }

  geometry_use_sem(geometry, use_gt=false) {
    if (!geometry.hasAttribute('uv')) return;

    const colorAttribute = geometry.getAttribute('color');
    const uvAttribute = geometry.getAttribute('uv');
    const count = colorAttribute.count;

    for (let i = 0; i < count; i++) {
      const label_class = use_gt? uvAttribute.getX(i): uvAttribute.getY(i);
      const class2name = dataset_semseg[this.params['dataset']]['class2name'];
      const color_value = this.params_semseg[class2name[label_class]];
      const color = new THREE.Color(color_value);
      colorAttribute.setXYZ(i, color.r, color.g, color.b);
    }

    colorAttribute.needsUpdate = true;
    this.use_gt = use_gt;
  }

  // ---------------------------------------------
  // Loader
  // ---------------------------------------------

  loader_update_mapping() {
    let mapping = {}
    let attr_gt = this.params['attr_gt'];
    let attr_pred = this.params['attr_pred'];
    mapping[attr_gt] = 'u';
    mapping[attr_pred] = 'v';
    // trick - mapping labels to uv -> u: gt / v: pred
    this.ply_loader.setPropertyNameMapping(mapping);
  }

  // ---------------------------------------------
  // Animate
  // ---------------------------------------------
  
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
