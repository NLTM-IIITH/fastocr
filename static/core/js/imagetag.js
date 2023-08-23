'use strict';

var _REGION_SHAPE = { RECT:'rect',
                         CIRCLE:'circle',
                         ELLIPSE:'ellipse',
                         POLYGON:'polygon',
                         POINT:'point'};

var _ZONE_TYPE = { TEXT:'text',
                         GRAPHIC:'graphic',
                         HEADING:'heading',
                         TITLE:'title',
                         SUBTITLE:'subtitle'};

var _selected_while_input;

var _REGION_EDGE_TOL           = 5;   // pixel
var _REGION_CONTROL_POINT_SIZE = 2;
var _REGION_POINT_RADIUS       = 3;
var _POLYGON_VERTEX_MATCH_TOL  = 5;
var _REGION_MIN_DIM            = 3;
var _MOUSE_CLICK_TOL           = 2;
var _ELLIPSE_EDGE_TOL          = 0.2; // euclidean distance
var _THETA_TOL                 = Math.PI/18; // 10 degrees
var _POLYGON_RESIZE_VERTEX_OFFSET    = 100;
var _CANVAS_DEFAULT_ZOOM_LEVEL_INDEX = 3;
var _CANVAS_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4, 5];

var _THEME_REGION_BOUNDARY_WIDTH = 4;
var _THEME_BOUNDARY_LINE_COLOR   = "#1a1a1a";
var _THEME_BOUNDARY_FILL_COLOR   = "#aaeeff";
var _THEME_SEL_REGION_FILL_COLOR = "#808080";
var _THEME_SEL_REGION_FILL_BOUNDARY_COLOR = "#000000";
var _THEME_SEL_REGION_OPACITY    = 0.5;
var _THEME_MESSAGE_TIMEOUT_MS    = 2500;
var _THEME_ATTRIBUTE_VALUE_FONT  = '10pt Sans';
var _THEME_CONTROL_POINT_COLOR   = '#ff0000';

var _CSV_SEP        = ',';
var _CSV_QUOTE_CHAR = '"';
var _CSV_KEYVAL_SEP = ':';
var _IMPORT_CSV_COMMENT_CHAR = '#';

var _img_metadata = {};   // data structure to store loaded images metadata
var _img_region_id = 1;
var _img_count    = 0;    // count of the loaded images
var _canvas_regions = []; // image regions spec. in canvas space
var _canvas_scale   = 1.0;// current scale of canvas image

var _image_id_list  = []; // array of image id (in original order)
var _image_id       = ''; // id={filename+length} of current image
var _image_index    = -1; // index

var _current_image_filename;
var _current_image;
var _current_image_width;
var _current_image_height;

// image canvas
var _img_canvas ;//= document.getElementById("image_canvas");
var _img_ctx   ;//= _img_canvas.getContext("2d");
var _reg_canvas ;//= document.getElementById("region_canvas");
var _reg_ctx    ;//= _reg_canvas.getContext("2d");
var _canvas_width, _canvas_height;

// canvas zoom
var _canvas_zoom_level_index   = _CANVAS_DEFAULT_ZOOM_LEVEL_INDEX; // 1.0
var _canvas_scale_without_zoom = 1.0;

// state of the application
var _is_user_drawing_region  = false;
var _current_image_loaded    = false;
var _is_window_resized       = false;
var _is_user_resizing_region = false;
var _is_user_moving_region   = false;
var _is_user_drawing_polygon = false;
var _is_region_selected      = false;
var _is_all_region_selected  = false;
var _is_user_updating_attribute_name  = false;
var _is_user_updating_attribute_value = false;
var _is_user_adding_attribute_name    = false;
var _is_loaded_img_list_visible  = false;
var _is_attributes_panel_visible = false;
var _is_reg_attr_panel_visible   = false;
var _is_file_attr_panel_visible  = false;
var _is_canvas_zoomed            = false;
var _is_loading_current_image    = false;
var _is_region_id_visible        = true;
var _is_region_boundary_visible  = true;
var _is_ctrl_pressed             = false;
var _cur_region_id               = 0;
var _cur_reg_drawing_id          = -1;
var nested_region_id             = -1;

var _is_region_shape_list_visible = true;
var region_shape_list = document.getElementById("accordion_region_shape_panel");

// region
var _current_shape    ;//         = _REGION_SHAPE.RECT;
var _current_polygon_region_id = -1;
var _user_sel_region_id        = -1;
var _click_x0 = 0; var _click_y0 = 0;
var _click_x1 = 0; var _click_y1 = 0;
var _region_click_x, _region_click_y;
var _copied_image_regions = [];
var _region_edge          = [-1, -1];
var _current_x = 0; var _current_y = 0;

// message
var _message_clear_timer;

// attributes
var _region_attributes             = {};
var _current_update_attribute_name = "";
var _current_update_region_id      = -1;
var _file_attributes               = {};
var _visible_attr_name             = '';
var _current_type                  = 'text';
var attributes_values              = {};


// persistence to local storage
var _is_local_storage_available = false;
var _is_save_ongoing = false;

// image list
var _reload_img_table = true;
var _loaded_img_fn_list = [];
var _loaded_img_region_attr_miss_count = [];
var _loaded_img_file_attr_miss_count = [];
var _loaded_img_table_html = [];

//Legend to identify types of B.box
var legendList = {};
// var _region_attributes  = {};

// UI html elements
var invisible_file_input = document.getElementById("invisible_file_input");
var image_panel  = document.getElementById("image_panel");
var ui_top_panel = document.getElementById("ui_top_panel");
var canvas_panel = document.getElementById("canvas_panel");

var annotation_list_snippet = document.getElementById("annotation_list_snippet");
var annotation_textarea     = document.getElementById("annotation_textarea");

var loaded_img_list_panel = document.getElementById('loaded_img_list_panel');
var attributes_panel      = document.getElementById('attributes_panel');
var annotation_data_window;

var BBOX_LINE_WIDTH       = 4;
var BBOX_SELECTED_OPACITY = 0.3;
var BBOX_BOUNDARY_FILL_COLOR_ANNOTATED = "#f2f2f2";
var BBOX_BOUNDARY_FILL_COLOR_NEW       = "#aaeeff";
var BBOX_BOUNDARY_LINE_COLOR           = "#1a1a1a";
var BBOX_SELECTED_FILL_COLOR           = "#ffffff";


// User DIVs stored here
var label_id;
var legendListDesc = {};
//
// Data structure for annotations
//
function ImageMetadata(fileref, filename) {
  this.filename = filename;
  this.fileref  = fileref;          // image url or local file ref.
  this.regions  = [];
  this.file_attributes = {};        // image attributes
  this.base64_img_data = '';        // image data stored as base 64
}

function ImageRegion() {
  this.is_user_selected  = false;
  this.shape_attributes  = {}; // region shape attributes
  this.region_attributes = {}; // region attributes
  this.image_region_id = _img_region_id;
  _img_region_id++;

  this.ocr = '';
  this.is_ocr_loading = false;
  this.ocr_done = false;
  this.modality = document.getElementById("hiddenPageModality").value;
  this.ocr_version = document.getElementById("hiddenPageVersion").value;
  this.layout_version = document.getElementById("hiddenPageLayoutVersion").value;
  this.language = document.getElementById("hiddenPageLanguage").value;
}

function populate_region_list(legendList, label_id) {
  var container = document.getElementById(label_id);
  var dropdown_container = document.getElementById('region_dropdown');

  container.innerHTML = "";
  dropdown_container.innerHTML = "";

  for (var key in legendList) {
    //populating legend with colors
    var boxContainer = document.createElement("DIV");
    var box = document.createElement("DIV");
    var label = document.createElement("a");
    boxContainer.setAttribute('title', legendListDesc[key]);

    let new_key = key
    label.addEventListener('click', function (e) {
      change_region(new_key);
      if(!_is_reg_attr_panel_visible) {
          toggle_reg_attr_panel();
      }
     }, false);
    label.innerHTML = key;
    box.className = "box";
    box.style.backgroundColor = legendList[key];

    boxContainer.appendChild(box);
    boxContainer.appendChild(label);
    container.appendChild(boxContainer);
  }
}

function populate_shape_list(shapes, shape_id) {
    var container = document.getElementById(shape_id);
    var c = 0
    // console.log("shape container:");
    // console.log(container);
    for (var key in shapes) {
      //populating legend with colors
      // console.log(shapes);
        _REGION_SHAPE[ shapes[key]["region_shape"] ] = shapes[key]["code"];

        var boxContainer = document.createElement("li");
        boxContainer.setAttribute('title', shapes[key]["name"]);
        boxContainer.setAttribute('id', 'region_shape_' + shapes[key]["code"]);
        boxContainer.setAttribute('onclick', "select_region_shape('" + shapes[key]["code"] + "')");
        // boxContainer.setAttribute('style', 'height=20; width=20');
        if ( c == 0 ){
          _current_shape = _REGION_SHAPE[shapes[key]["region_shape"]];
          boxContainer.setAttribute('class', 'selected');
        }
        c++;
        var box = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        box.setAttribute('height', '32');
        box.setAttribute('viewbox', '0 0 32 32');
        // box.setAttribute("x", "10");
        // var box_inside = document.createElement("use");
        // box_inside.setAttribute('xlink:href', '#shape_'+shapes[key]["name"]);

        var useSVG = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        useSVG.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href', '#shape_'+shapes[key]["name"]);
        // useSVG.setAttributeNS(null, 'height', '50');
        // useSVG.setAttributeNS(null, 'width', '50');
        // useSVG.setAttribute("y", "10");
        // var shape = "<svg height='32' viewbox='0 0 32 32'><use xlink:href='#shape_"+shapes[key]["name"]+"'></use></svg>";
        box.appendChild(useSVG);
        boxContainer.appendChild(box);
        // boxContainer.appendChild(box);
        // boxContainer.appendChild(label);
        // console.log("box container");
        // console.log(boxContainer);
        container.appendChild(boxContainer);
        // console.log(container);

   }


}

//
// Initialization routine
//

function set_variables(){
 _REGION_SHAPE = {};

 _ZONE_TYPE = { TEXT:'text',
                         GRAPHIC:'graphic',
                         HEADING:'heading',
                         TITLE:'title',
                         SUBTITLE:'subtitle'};

 _REGION_EDGE_TOL           = 5;   // pixel
 _REGION_CONTROL_POINT_SIZE = 2;
 _REGION_POINT_RADIUS       = 3;
 _POLYGON_VERTEX_MATCH_TOL  = 5;
 _REGION_MIN_DIM            = 3;
 _MOUSE_CLICK_TOL           = 2;
 _ELLIPSE_EDGE_TOL          = 0.2; // euclidean distance
 _THETA_TOL                 = Math.PI/18; // 10 degrees
 _POLYGON_RESIZE_VERTEX_OFFSET    = 100;
 _CANVAS_DEFAULT_ZOOM_LEVEL_INDEX = 3;
 _CANVAS_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4, 5];

 _THEME_REGION_BOUNDARY_WIDTH = 4;
 _THEME_BOUNDARY_LINE_COLOR   = "#1a1a1a";
 _THEME_BOUNDARY_FILL_COLOR   = "#aaeeff";
 _THEME_SEL_REGION_FILL_COLOR = "#808080";
 _THEME_SEL_REGION_FILL_BOUNDARY_COLOR = "#000000";
 _THEME_SEL_REGION_OPACITY    = 0.5;
 _THEME_MESSAGE_TIMEOUT_MS    = 2500;
 _THEME_ATTRIBUTE_VALUE_FONT  = '10pt Sans';
 _THEME_CONTROL_POINT_COLOR   = '#ff0000';

 _CSV_SEP        = ',';
 _CSV_QUOTE_CHAR = '"';
 _CSV_KEYVAL_SEP = ':';
 _IMPORT_CSV_COMMENT_CHAR = '#';

 _img_metadata = {};   // data structure to store loaded images metadata
 _img_region_id = 1;   // image id
 _img_count    = 0;    // count of the loaded images
 _canvas_regions = []; // image regions spec. in canvas space
 _canvas_scale   = 1.0;// current scale of canvas image

 _image_id_list  = []; // array of image id (in original order)
 _image_id       = ''; // id={filename+length} of current image
 _image_index    = -1; // index

 _current_image_filename;
 _current_image;
 _current_image_width;
 _current_image_height;

// image canvas
 _img_canvas = document.getElementById("image_canvas");
 _img_ctx    = _img_canvas.getContext("2d");
 _reg_canvas = document.getElementById("region_canvas");
 _reg_ctx    = _reg_canvas.getContext("2d");
 _canvas_width, _canvas_height;

// canvas zoom
 _canvas_zoom_level_index   = _CANVAS_DEFAULT_ZOOM_LEVEL_INDEX; // 1.0
 _canvas_scale_without_zoom = 1.0;

// state of the application
 _is_user_drawing_region  = false;
 _current_image_loaded    = false;
 _is_window_resized       = false;
 _is_user_resizing_region = false;
 _is_user_moving_region   = false;
 _is_user_drawing_polygon = false;
 _is_region_selected      = false;
 _is_all_region_selected  = false;
 _is_user_updating_attribute_name  = false;
 _is_user_updating_attribute_value = false;
 _is_user_adding_attribute_name    = false;
 _is_loaded_img_list_visible  = false;
 _is_attributes_panel_visible = false;
 _is_reg_attr_panel_visible   = false;
 _is_file_attr_panel_visible  = false;
 _is_canvas_zoomed            = false;
 _is_loading_current_image    = false;
 _is_region_id_visible        = true;
 _is_region_boundary_visible  = true;
 _is_ctrl_pressed             = false;
 _cur_region_id               = 0;
 _cur_reg_drawing_id          = -1;
 nested_region_id             = -1;

 _is_region_shape_list_visible = true;
 region_shape_list = document.getElementById("accordion_region_shape_panel");
// region
 _current_shape     ;//        = _REGION_SHAPE.RECT;
 _current_polygon_region_id = -1;
 _user_sel_region_id        = -1;
 _click_x0 = 0;  _click_y0 = 0;
 _click_x1 = 0;  _click_y1 = 0;
 _region_click_x, _region_click_y;
 _copied_image_regions = [];
 _region_edge          = [-1, -1];
 _current_x = 0;  _current_y = 0;

// message
 _message_clear_timer;

// attributes
 _region_attributes             = {};
 _current_update_attribute_name = "";
 _current_update_region_id      = -1;
 _file_attributes               = {};
 _visible_attr_name             = '';
 _current_type                  = 'text';
 attributes_values              = {};

// persistence to local storage
 _is_local_storage_available = false;
 _is_save_ongoing = false;

// image list
 _reload_img_table = true;
 _loaded_img_fn_list = [];
 _loaded_img_region_attr_miss_count = [];
 _loaded_img_file_attr_miss_count = [];
 _loaded_img_table_html = [];

//Legend to identify types of B.box
 legendList = {};
 legendListDesc = {};
 // _region_attributes  = {};

// UI html elements
 invisible_file_input = document.getElementById("invisible_file_input");
 image_panel  = document.getElementById("image_panel");
 ui_top_panel = document.getElementById("ui_top_panel");
 canvas_panel = document.getElementById("canvas_panel");

 annotation_list_snippet = document.getElementById("annotation_list_snippet");
 annotation_textarea     = document.getElementById("annotation_textarea");

 loaded_img_list_panel = document.getElementById('loaded_img_list_panel');
 attributes_panel      = document.getElementById('attributes_panel');
 annotation_data_window;

 BBOX_LINE_WIDTH       = 4;
 BBOX_SELECTED_OPACITY = 0.3;
 BBOX_BOUNDARY_FILL_COLOR_ANNOTATED = "#f2f2f2";
 BBOX_BOUNDARY_FILL_COLOR_NEW       = "#aaeeff";
 BBOX_BOUNDARY_LINE_COLOR           = "#1a1a1a";
 BBOX_SELECTED_FILL_COLOR           = "#ffffff";

}

function init_canvas(canvas_id, region_canvas_id){
  // image canvas
 _img_canvas = document.getElementById("image_canvas");
 _img_ctx    = _img_canvas.getContext("2d");
 _reg_canvas = document.getElementById("region_canvas");
 _reg_ctx    = _reg_canvas.getContext("2d");
 _canvas_width, _canvas_height;
}

function populate_attribute_position(attribute_id){

  // <div onclick="toggle_attributes_input_panel()" class="attributes_panel_button">&times;</div>
  var body = document.getElementById(attribute_id);
  var boxContainer = document.createElement("div");
  // boxContainer.setAttribute("onclick", "toggle_attributes_input_panel()");
  boxContainer.setAttribute("onclick", "populate_popup()");
  boxContainer.setAttribute("style", "width: 10px;color: black;font-size: x-large;margin-left: 0.5em;padding: 0;");
  boxContainer.innerHTML = "&times;";
  var center = document.createElement("center");
  var warn = document.createElement("span");
  warn.setAttribute("style", "color: red; font-size:18px; float: center;");
  warn.innerHTML = "&#42; Required";
  body.appendChild(boxContainer);
  center.appendChild(warn);
  body.appendChild(center);

}

function required_attributes_filled(){
  var type = _img_metadata[_image_id].regions[_selected_while_input].shape_attributes.type;

  for (var col in _region_attributes[type] ){
    var has = _img_metadata[_image_id].regions[_selected_while_input].region_attributes;
    if(_region_attributes[type][col].att_type){
      if(!has.hasOwnProperty(_region_attributes[type][col].att_name)){
        return false;
      }
    }
  }
  return true;
}

function reload_shape_division(){
  var shape = document.getElementById("region_shape_rect");
  console.log(shape.class);
  console.log(shape);
}

function populate_popup() {
  //Check for condition
  if(required_attributes_filled()){

    toggle_attributes_input_panel();
    var select_shape_con = document.getElementById("region_shape_rect");
    _current_shape = _REGION_SHAPE['RECT'];
    select_shape_con.class = "selected";
    select_shape_con.classList.toggle("selected");
    reload_shape_division();
    _redraw_reg_canvas();
    _reg_canvas.focus();
  }

  else{

    let container = document.getElementById("canvas_panel");
    let _modal_ = document.createElement("DIV");
    _modal_.setAttribute("id", "popup");
    _modal_.style = "display: block; position: fixed; z-index: 5; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgb(0,0,0); background-color: rgba(0,0,0,0.8);"
    let _modal_content = document.createElement("DIV");
    _modal_content.setAttribute("id", "popup-content");
    _modal_content.style = "background-color: rgb(245, 245, 245); margin: 10% auto; padding: 40px; border: 1px solid #888; width: 40%; height: 20%; color:red;";
    _modal_content.innerHTML = "<p>Please enter the required (<b>*</b>) fields.</p>"
    let _modal_btn = document.createElement("button");
    _modal_btn.setAttribute("type", "btn btn-primary");
    _modal_btn.innerHTML = "close";
    _modal_btn.style.float = "right";
    _modal_btn.style = "font-size: 18px; margin-top: 60px; background-color: black; color: white; float:right;";
    let _modal_btn_2 = document.createElement("button");
    _modal_btn_2.setAttribute("type", "btn btn-primary");
    _modal_btn_2.innerHTML = "clear";
    _modal_btn_2.style.float = "right";
    _modal_btn_2.style = "font-size: 18px; margin-top: 60px; background-color: black; color: white; float: left";
    _modal_content.appendChild(_modal_btn);
    _modal_content.appendChild(_modal_btn_2);
    _modal_.appendChild(_modal_content);
    container.appendChild(_modal_);

    _modal_btn.onclick = function(){
      _modal_.style.display = "none";
      // var select_shape_con = document.getElementById("region_shape_rect");
      // _current_shape = _REGION_SHAPE['RECT'];
      // select_shape_con.class = "selected";
      reload_shape_division();
    }
    // remove all the selected areas
    _modal_btn_2.onclick = function(){
      _modal_.style.display = "none";
      var select_shape_con = document.getElementById("region_shape_rect");
      _current_shape = _REGION_SHAPE['RECT'];
      console.log("current shape: " + _current_shape);
      // select_shape_con.class = "selected";
      select_shape_con.classList.toggle("selected");
      console.log("before");
      select_shape_con = document.getElementById("region_shape_rect");
      console.log(select_shape_con);
      console.log("after");
      reload_shape_division();
      // console.log(select_shape_con.class);
      // console.log("selected the rectangle region");

      // _redraw_reg_canvas();
      // _reg_canvas.focus();
      del_sel_and_toggle_regions();

    }
  }
}


function _init_seg_tool(event) {
  show_body(event["container_id"]);
  set_variables();
  init_canvas("image_canvas", "region_canvas");
  update_eventListeners();

  label_id = "legend";
  show_home_panel();
  var labels = event["region"];
  var shapes = event["shapes"];
  var shape_id = "accordion_region_shape_panel";

  for (var i = 0; i < labels.length; i++) {
    legendList[ labels[i]["region_name"] ] = labels[i]["region_color"];
    legendListDesc[ labels[i]["region_name"] ] = labels[i]["region_description"];
    _region_attributes[ labels[i]["region_name"]] = labels[i]["region_attributes"]
  }
  // console.log(legendList);
  populate_region_list(legendList, label_id);
  populate_shape_list(shapes, shape_id);
  populate_attribute_position("attributes_panel_toolbar");


  _is_local_storage_available = check_local_storage();
  if (_is_local_storage_available) {
    if (is_data_in_localStorage()) {
      show_localStorage_recovery_options();
    }
  }
  // run attached sub-modules (if any)
  if (typeof _load_submodules === 'function') {
    setTimeout(function() {
      _load_submodules();
    }, 100);
  }
  console.log("function initialized"); 
  // sel_local_images();
  
  show_image(0);
}

function show_body(container_id){
  var master = document.getElementById(container_id);
  master.innerHTML = '<svg style="position: absolute; width: 0; height: 0; overflow: hidden;" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\
    <defs>\
      <symbol id="shape_rectangle">\
        <title>Rectangular region shape</title>\
        <rect width="20" height="12" x="6" y="10" stroke-width="2"/>\
      </symbol>\
      <symbol id="shape_circle">\
        <title>Circular region shape</title>\
        <circle r="10" cx="16" cy="16" stroke-width="2"/>\
      </symbol>\
      <symbol id="shape_ellipse">\
        <title>Elliptical region shape</title>\
        <ellipse rx="12" ry="8" cx="16" cy="16" stroke-width="2"/>\
      </symbol>\
      <symbol id="shape_polygon">\
        <title>Polyline region shape</title>\
        <path d="M 15.25,2.2372 3.625,11.6122 6,29.9872 l 20.75,-9.625 2.375,-14.75 z" stroke-width="2"/>\
      </symbol>\
    </defs>\
  </svg>\
  \
  <!-- <div class="top_panel" id="ui_top_panel">\
    Navigation menu -->\
    <div class="">\
      <ul>\
        <!-- <li class="dropdown"><a onclick="sel_local_images()" title="Load (or add) a set of images from local disk">Load or Add Images</a>    </li> -->\
        <!--<li class="dropdown"><a onclick="show_annotation_data()" title="View annotations">View annotations</a>\
          <div class="dropdown-content">\
            <a onclick="download_all_region_data(\'json\')" title="Import existing region data from CSV or JSON file">Import</a>-->\
            <!--<a onclick="download_all_region_data(\'csv\')" title="Save image region annotations as a CSV(comma separated value) file">Save as CSV</a>\
            <a onclick="download_all_region_data(\'json\')" title="Save image region annotations as a JSON(Javascript Object Notation) file">Save as JSON</a>-->\
            \
          </div>\
        </li> \
        <!--<li class="dropdown"><a title="View" class="drop_menu_item">View &#9662;</a>\
          <div class="dropdown-content">\
            <a onclick="toggle_leftsidebar()" title="Show/hide left sidebar">Show/hide left sidebar</a>\
            <a onclick="toggle_region_boundary_visibility()" title="Show or hide region boundaries">Show/hide region boundaries</a>\
            <a onclick="toggle_region_id_visibility()" title="Show or hide region labels">Show/hide region labels</a>\
          </div>\
        </li>-->\
        <!--<li class="dropdown">\
        <a title="Change Region" class="drop_menu_item">Change Region &#9662;</a> -->\
          <div class="dropdown-content" id="region_dropdown">\
            <!-- <a onclick="change_region_text()" title="Change Region type to Text">Text</a>\
            <a onclick="change_region_graphic()" title="Change Region type to Graphic">Graphic</a>\
            <a onclick="change_region_equation()" title="Change Region type to Equation">Equation</a>\
            <a onclick="change_region_title()" title="Change Region type to Title">Title</a> -->\
          </div>\
        </li>\
        <!-- The Modal -->\
<div id="myModal" class="modal">\
\
<!-- Modal content -->\
<div class="modal-content">\
  <span class="close">&times;</span>\
\
  <!-- <form action="#" onsubmit="return validateFormOnSubmit(this);"> -->\
    <p style="color:black;">Region Name : </p><input type="text" name="region_name" placeholder= "region name" id="region_name" value="" required><br>\
    <p style="color:black;">Region Description : </p><input type="text" name="region_desc" placeholder= "Region Description" id="region_desc" value="" required><br>\
    <input type="color" id="region_color" name="region_color"\
         value="#e66465">\
  <label for="head">Head</label>\
\
    <input type="submit" value="Submit" onclick="validateFormOnSubmit({ region_name_id: \'region_name\', region_desc_id: \'region_desc\', region_color_id: \'region_color\'})">\
    <!-- </form> -->\
 <!-- <input type="text" name="fname"><br> -->\
</div>\
\
</div>\
      </ul>\
\
    </div> <!-- end of #navbar -->\
\<button class = "btn" id="toolbar_del_region" onclick="del_sel_regions()" title="Delete Region"><span STYLE="color: red; font-size: 8pt" class="oi oi-delete"><b>Delete</b></span></button>\
    <!-- Shortcut toolbar -->\
    <div class="">\
      <ul>\
        <!--\
        <li onclick="sel_local_images()" title="Load or Add Images">&ctdot;</li>\
        <li onclick="sel_local_data_file(\'annotations\')" title="Import Annotations">&uarr;</li>\
        <li onclick="download_all_region_data(\'csv\')" title="Save Annotations (as CSV)">&DownArrowBar;</li>\
        -->\
        <!--<li id="toolbar_prev_img" style="margin-left: 1em;" onclick="move_to_prev_image()" title="Previous Image">&larr;</li>\
        <li id="toolbar_next_img" onclick="move_to_next_image()" title="Next Image">&rarr;</li>\
        <li id="toolbar_list_img" onclick="toggle_img_list()" title="List Images">&#9776;</li>\
        <li id="toolbar_zoom_out" style="margin-left: 2em;" onclick="zoom_out()" title="Zoom Out">&minus;</li>\
        <li id="toolbar_zoom_in" onclick="zoom_in()" title="Zoom In">&plus;</li>\
        <li id="toolbar_zoom_reset" onclick="reset_zoom_level()" title="Zoom Reset">&equals;</li>-->\
        <!--<li id="toolbar_copy_region" style="margin-left: 2em;" onclick="copy_sel_regions()" title="Copy Region">c</li>\
        <li id="toolbar_paste_region" onclick="paste_sel_regions()" title="Paste Region">v</li>\
        <li id="toolbar_sel_all_region" onclick="sel_all_regions()" title="Select All Regions">a</li>\
        <li id="toolbar_del_region" onclick="del_sel_regions()" title="Delete Region">&times;</li>-->\
      </ul>\
    </div> <!-- endof #toolbar \
    <input type="file" id="invisible_file_input" multiple name="files["/media/uploaded_images/222_demo/Jiddu_Krishnamurti/Jiddu_Krishnamurti_1.jpg"]" style="display:none">\
   endof #top_panel --></div>\
  <!-- Middle Panel contains a left-sidebar and image display areas -->\
  <div class="middle_panel">\
    <div id="leftsidebar" style="display:none;">\
      <button onclick="toggle_region_shape_list(this)" id= "region_shapes" class="leftsidebar_accordion active">Shape</button>\
      <div class="leftsidebar_accordion_panel show" >\
        <ul class="region_shape" id="accordion_region_shape_panel">\
          <!-- <li id="region_shape_rect" class="selected" onclick="select_region_shape(\'rect\')" title="Rectangle"><svg height="32" viewbox="0 0 32 32"><use xlink:href="#shape_rectangle"></use></svg></li>\
          <li id="region_shape_point" onclick="select_region_shape(\'point\')" title="Point"><svg height="32" viewbox="0 0 32 32"><use xlink:href="#shape_point"></use></svg></li>\
          <li id="region_shape_ellipse" onclick="select_region_shape(\'ellipse\')" title="Ellipse"><svg height="32" viewbox="0 0 32 32"><use xlink:href="#shape_ellipse"></use></svg></li>\
          <li id="region_shape_polygon" onclick="select_region_shape(\'polygon\')" title="Polygon"><svg height="32" viewbox="0 0 32 32"><use xlink:href="#shape_polygon"></use></svg></li> \
          <li id="region_shape_circle" onclick="select_region_shape(\'circle\')" title="Circle"><svg height="32" viewbox="0 0 32 32"><use xlink:href="#shape_circle"></use></svg></li> -->\
\
        </ul>\
      </div>\
\
      <button class="leftsidebar_accordion" id="reg_attr_panel_button">Region</button>\
            <div id="legend">\
      </div>\
      <div class="leftsidebar_accordion_panel">\
        <table style="padding: 2em 0em;">\
          <tr>\
            <td style="width: 6em;">n/p (&larr;/&rarr;)</td>\
            <td>Next/Previous image</td>\
          </tr>\
          <tr>\
            <td>+&nbsp;/&nbsp;-&nbsp;/&nbsp;=</td>\
            <td>Zoom in/out/reset</td>\
          </tr>\
          <tr>\
            <td>Ctrl + c</td>\
            <td>Copy sel. regions</td>\
          </tr>\
          <tr>\
            <td>Ctrl + v</td>\
            <td>Paste sel. regions</td>\
          </tr>\
          <tr>\
            <td>Ctrl + a</td>\
            <td>Select all regions</td>\
          </tr>\
          <tr>\
            <td>Del, Bkspc</td>\
            <td>Delete image region</td>\
          </tr>\
          <tr> \
            <td>Esc</td>\
            <td>Cancel operation</td>\
          </tr>\
          <tr>\
            <td>Ctrl + s</td>\
            <td>Download annotations</td>\
          </tr>\
          <tr>\
            <td>Spacebar</td>\
            <td>Toggle image list</td>\
          </tr>\
        </table>\
      </div>\
\
    </div> <!-- end of leftsidebar -->\
    <div id="leftsidebar_collapse_panel" style="display:none;">\
      <div onclick="toggle_leftsidebar()" id="leftsidebar_collapse_button" title="Show/hide left toolbar">\
        &ltrif;</div>\
    </div>\
    <div id="display_area">\
      <div id="canvas_panel">\
        <canvas id="image_canvas" style="border:1px solid #000000;"></canvas>\
        <canvas id="region_canvas" style="border:1px solid #000000;">Sorry, your browser does not support HTML5 Canvas functionality which is required for this application.</canvas>\
      </div></div></div>\
  <div id="attributes_panel">\
    <div id="attributes_panel_toolbar"></div>\
    <table id="attributes_panel_table"></table>\
  </div>\
  <div id="message_panel"></div>\
  <div style="width: 100%;" id="vertical_space"></div>';
}

//
// Handlers for top navigation bar
//
function show_home_panel() {
  if (_current_image_loaded) {
    show_all_canvas();
    set_all_text_panel_display('none');
  } else {
    var start_info = '<p><a title="Load or Add Images" style="cursor: pointer; color: blue;" onclick="sel_local_images()">Load images</a> to start annotation or, see <a title="Getting started with  Image Annotator" style="cursor: pointer; color: blue;" onclick="show_getting_started_panel()">Getting Started</a>.</p>';
    clear_image_display_area();
  }
}

function download_all_region_data(type) {
  // Javascript strings (DOMString) is automatically converted to utf-8
  // see: https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob
  var all_region_data = pack_metadata(type);
  var page = document.getElementById("hiddenPage_id");
  var is_final = document.getElementById("isFinalPage")
  var page_number = document.getElementById("hiddenPageNumber")
  var hidden_page_id = page.value
  console.log(all_region_data , page_number);
  var url = "/ocr_testing/api/get_annotations/"
  var data = {'pageid': hidden_page_id ,'annotation': all_region_data};
  console.table(data);
  console.log("sending annotation request");
  $.ajax({
        type:"POST",
        url: url,
        async: false,
        cache: false,
        timeout: 30000,
        data: data,
        success: function (response){
          console.log(">>>" + typeof(response));
          console.log();
		      window.location.href = "/ocr_testing/page_detail/"+hidden_page_id;
        },
        error: function(errorThrown){
	        console.log(errorThrown);
          console.log("OOPS!","Looks like there was an error: " + errorThrown, "error");
        }
      });
}

function download_all_region_data_next_page(type) {
  // Javascript strings (DOMString) is automatically converted to utf-8
  // see: https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob
  var all_region_data = pack_metadata(type);
  var page = document.getElementById("hiddenPage_id");
  var is_final = document.getElementById("isFinalPage")
  var page_number = document.getElementById("hiddenPageNumber")
  var hidden_page_id = page.value
  console.log(all_region_data , page_number);
  var url = "/ocr_testing/api/get_annotations/"
  var data = {'pageid': hidden_page_id ,'annotation': all_region_data, 'next': true};
  console.table(data);
  console.log("sending annotation request");
  $.ajax({
        type:"POST",
        url: url,
        async: false,
        cache: false,
        timeout: 30000,
        data: data,
        success: function (response){
          console.log(">>>" + typeof(response));
          console.log();
          console.log(response.url);
		      window.location.href = response.url;
        },
        error: function(errorThrown){
	        console.log(errorThrown);
          console.log("OOPS!","Looks like there was an error: " + errorThrown, "error");
        }
      });
}

function import_attributes() {
  if (_current_image_loaded) {
    if (invisible_file_input) {
      invisible_file_input.accept   = '.csv,.json';
      invisible_file_input.onchange = import_region_attributes_from_file;
      invisible_file_input.click();
    }
  } else {
    show_message("Please load some images first");
  }
}
/*function show_about_panel() {
  set_all_text_panel_display('none');
  document.getElementById("about_panel").style.display = "block";
  canvas_panel.style.display = "none";
}
function show_getting_started_panel() {
  set_all_text_panel_display('none');
  document.getElementById("getting_started_panel").style.display = "block";
  canvas_panel.style.display = "none";
}*/
function set_all_text_panel_display(style_display) {
  var tp = document.getElementsByClassName('text_panel');
  for ( var i = 0; i < tp.length; ++i ) {
    tp[i].style.display = style_display;
  }
}
function clear_image_display_area() {
  // hide_all_canvas();
  set_all_text_panel_display('none');
}

//
// Local file uploaders
//

// Data Importer
//

function import_region_attributes_from_file(event) {
  var selected_files = event.target.files;
  for ( var i=0 ; i < selected_files.length; ++i ) {
    var file = selected_files[i];
    switch(file.type) {
    case 'text/csv':
      load_text_file(file, import_region_attributes_from_csv);
      break;

    default:
      show_message('Region attributes cannot be imported from file of type ' + file.type);
      break;
    }
  }
}


function import_annotations_from_file(event) {
  var selected_files = event.target.files;
  for ( var i = 0; i < selected_files.length; ++i ) {
    var file = selected_files[i];
    switch(file.type) {
    case '': // Fall-through // Windows 10: Firefox and Chrome do not report filetype
      show_message('File type for ' + file.name + ' cannot be determined! Assuming text/plain.');
    case 'text/plain': // Fall-through
    case 'application/vnd.ms-excel': // Fall-through // @todo: filetype of VIA csv annotations in Windows 10 , fix this (reported by @Eli Walker)
    case 'text/csv':
      load_text_file(file, import_annotations_from_csv);
      break;

    case 'text/json': // Fall-through
    case 'application/json':
      load_text_file(file, import_annotations_from_json);
      break;

    default:
      show_message('Annotations cannot be imported from file of type ' + file.type);
      break;
    }
  }
}

// s = '{"name":"rect","x":188,"y":90,"width":243,"height":233}'
function json_str_to_map(s) {
  if (typeof(s) === 'undefined' || s.length === 0 ) {
    return {};
  }

  return JSON.parse(s);
}

//

function map_to_json(m) {
  var s = [];
  for ( var key in m ) {
    var v   = m[key];
    var si  = JSON.stringify(key);
    si += _CSV_KEYVAL_SEP;
    si += JSON.stringify(v);
    s.push( si );
  }
  return '{' + s.join(_CSV_SEP) + '}';
}

function escape_for_csv(s) {
  return s.replace(/["]/g, '""');
}

function unescape_from_csv(s) {
  return s.replace(/""/g, '"');
}

function remove_prefix_suffix_quotes(s) {
  if ( s.charAt(0) === '"' && s.charAt(s.length-1) === '"' ) {
    return s.substr(1, s.length-2);
  } else {
    return s;
  }
}

function clone_image_region(r0) {
  var r1 = new ImageRegion();
  r1.is_user_selected = r0.is_user_selected;

  // copy shape attributes
  for ( var key in r0.shape_attributes ) {
    r1.shape_attributes[key] = clone_value(r0.shape_attributes[key]);
  }

  // copy region attributes
  for ( var key in r0.region_attributes ) {
    r1.region_attributes[key] = clone_value(r0.region_attributes[key]);
  }
  return r1;
}

function clone_value(value) {
  if ( typeof(value) === 'object' ) {
    if ( Array.isArray(value) ) {
      return value.slice(0);
    } else {
      var copy = {};
      for ( var p in value ) {
        if ( value.hasOwnProperty(p) ) {
          copy[p] = clone_value(value[p]);
        }
      }
      return copy;
    }
  }
  return value;
}

function _get_image_id(filename, size) {
  if ( typeof(size) === 'undefined' ) {
    return filename;
  } else {
    return filename;
  }
}

function load_text_file(text_file, callback_function) {
  if (text_file) {
    var text_reader = new FileReader();
    text_reader.addEventListener( 'progress', function(e) {
      show_message('Loading data from text file : ' + text_file.name + ' ... ');
    }, false);

    text_reader.addEventListener( 'error', function() {
      show_message('Error loading data from text file :  ' + text_file.name + ' !');
      callback_function('');
    }, false);

    text_reader.addEventListener( 'load', function() {
      callback_function(text_reader.result);
    }, false);
    text_reader.readAsText(text_file, 'utf-8');
  }
}

//
// Data Exporter
//
function pack_metadata(return_type) {
  if( return_type === 'csv' ) {
    var csvdata = [];
    var csvheader = '#filename,file_size,file_attributes,region_count,region_id,region_shape_attributes,region_attributes';
    csvdata.push(csvheader);

    for ( var image_id in _img_metadata ) {
      var fattr = map_to_json( _img_metadata[image_id].file_attributes );
      fattr = escape_for_csv( fattr );

      var prefix = '\n' + _img_metadata[image_id].filename;
      prefix += ',' + _img_metadata[image_id].size;
      prefix += ',"' + fattr + '"';

      var r = _img_metadata[image_id].regions;

      if ( r.length !==0 ) {
        for ( var i = 0; i < r.length; ++i ) {
          var csvline = [];
          csvline.push(prefix);
          csvline.push(r.length);
          csvline.push(i);

          var sattr = map_to_json( r[i].shape_attributes );
          sattr = '"' +  escape_for_csv( sattr ) + '"';
          csvline.push(sattr);

          var rattr = map_to_json( r[i].region_attributes );
          rattr = '"' +  escape_for_csv( rattr ) + '"';
          csvline.push(rattr);
          csvdata.push( csvline.join(_CSV_SEP) );
        }
      } else {
        // @todo: reconsider this practice of adding an empty entry
        csvdata.push(prefix + ',0,0,"{}","{}"');
      }
    }
    return csvdata;
  } else {
    // JSON.stringify() does not work with Map()
    // hence, we cast everything as objects
    var _img_metadata_as_obj = {};
    for ( var image_id in _img_metadata ) {
      var image_data = {};
      //image_data.fileref = _img_metadata[image_id].fileref;
      image_data.fileref = '';
      image_data.size = _img_metadata[image_id].size;
      image_data.filename = _img_metadata[image_id].filename;
      image_data.base64_img_data = '';
      //image_data.base64_img_data = _img_metadata[image_id].base64_img_data;

      // copy file attributes
      image_data.file_attributes = {};
      for ( var key in _img_metadata[image_id].file_attributes ) {
        image_data.file_attributes[key] = _img_metadata[image_id].file_attributes[key];
      }

      // copy all region shape_attributes
      image_data.regions = {};
      for ( var i = 0; i < _img_metadata[image_id].regions.length; ++i ) {
        image_data.regions[i] = {};
        image_data.regions[i].shape_attributes = {};
        image_data.regions[i].region_attributes = {};
        // copy region shape_attributes
        for ( var key in _img_metadata[image_id].regions[i].shape_attributes ) {
          image_data.regions[i].shape_attributes[key] = _img_metadata[image_id].regions[i].shape_attributes[key];
        }
        // copy region_attributes
        for ( var key in _img_metadata[image_id].regions[i].region_attributes ) {
          image_data.regions[i].region_attributes[key] = _img_metadata[image_id].regions[i].region_attributes[key];
        }
      }
      _img_metadata_as_obj[image_id] = image_data;
    }
    return [JSON.stringify(_img_metadata_as_obj)];
  }
}

function save_data_to_local_file(data, filename) {
  var a      = document.createElement('a');
  a.href     = URL.createObjectURL(data);
  a.target   = '_blank';
  a.download = filename;

  // simulate a mouse click event
  var event = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });

  a.dispatchEvent(event);
}

//
// Maintainers of user interface
//

function show_message(msg, t) {
  /*if ( _message_clear_timer ) {
    clearTimeout(_message_clear_timer); // stop any previous timeouts
  }
  var timeout = t;
  if ( typeof t === 'undefined' ) {
    timeout = _THEME_MESSAGE_TIMEOUT_MS;
  }
  document.getElementById('message_panel').innerHTML = msg;
  _message_clear_timer = setTimeout( function() {
    document.getElementById('message_panel').innerHTML = ' ';
  }, timeout);*/
}

function show_image(image_index){
  var user_selected_images = document.getElementById('hardimage');
  console.log(" user_selected_images have>>>" + user_selected_images);
  var original_image_count = _img_count;
  var discarded_file_count = 0;
  if (true) {
    var img_id = String(user_selected_images.src).split("/");
    var filename = img_id[img_id.length-1];
    console.log("This is image name >>" + filename);
    console.log("This is image_id which is parameter for _img_metadata should be false>>>" + _img_metadata.hasOwnProperty('filename'));
    _img_metadata[filename] = new ImageMetadata(user_selected_images.src,filename);
    console.log("newly created img_metadata >>" + _img_metadata + "it is an object so please print it by typing only");
    // console.table(_img_metadata["aa.jpg"])
    _image_id_list.push(filename);
    _img_count += 1;
    _reload_img_table = true;
  }


    // console.table(_img_metadata[img_id]);
  if (_is_loading_current_image) {
    console.log("Image is loading");
    return;
  }

  var img_id = _image_id_list[image_index];
  console.log(_image_id_list[image_index] , img_id);
  if ( !_img_metadata.hasOwnProperty(img_id)) {
    console.log("_img_metadata has the propery img_id");
    return;
  }

  var img_filename = _img_metadata[img_id].filename;
  _current_image = user_selected_images;
  _current_image.src = user_selected_images.src;
  _image_id = img_id;
  _image_index = image_index;
  _current_image_filename = img_filename;
  _current_image_loaded = true;
  _is_loading_current_image = false;
  _click_x0 = 0; _click_y0 = 0;
  _click_x1 = 0; _click_y1 = 0;
  _is_user_drawing_region = false;
  _is_window_resized = false;
  _is_user_resizing_region = false;
  _is_user_moving_region = false;
  _is_user_drawing_polygon = false;
  _is_region_selected = false;
  _user_sel_region_id = -1;
  _current_image_width = _current_image.naturalWidth;
  _current_image_height = _current_image.naturalHeight;
  console.log(_image_id , _image_index , _current_image_filename , _current_image_width, _current_image_height);
  
  // set the size of canvas
  // based on the current dimension of browser window
  var de = document.documentElement;
  var canvas_panel_width = de.clientWidth;
  var canvas_panel_height = de.clientHeight;
  var canvas_panel_width = document.getElementById("display_area").clientWidth - 20;
  console.log("_current_image_size", _current_image_width, _current_image_height);
  console.log("canvas_panel_size", canvas_panel_width, canvas_panel_height);
  _canvas_width = _current_image_width;
  _canvas_height = _current_image_height;
  if ( _canvas_width > canvas_panel_width ) {
    // resize image to match the panel width
    var scale_width = canvas_panel_width / _current_image.naturalWidth;
    _canvas_width = canvas_panel_width;
    _canvas_height = _current_image.naturalHeight * scale_width;
  }
  if ( _canvas_height > canvas_panel_height ) {
    // resize further image if its height is larger than the image panel
    var scale_height = canvas_panel_height / _canvas_height;
    _canvas_height = canvas_panel_height;
    _canvas_width = _canvas_width * scale_height;
  }
  _canvas_width = Math.round(_canvas_width);
  _canvas_height = Math.round(_canvas_height);
  _canvas_scale = _current_image.naturalWidth / _canvas_width;
  _canvas_scale_without_zoom = _canvas_scale;
  console.log(_canvas_width, _canvas_height, scale_width, scale_height, _canvas_scale);
  // console.log
  set_all_canvas_size(_canvas_width, _canvas_height);
  console.log("called set_all_canvas_size with params", _canvas_width, _canvas_height);
  //set_all_canvas_scale(_canvas_scale_without_zoom);
  // ensure that all the canvas are visible
  clear_image_display_area();
  console.log("called clear_image_display_area");
  show_all_canvas();
  console.log("called show_all_canvas");

  // we only need to draw the image once in the image_canvas
  _img_ctx.clearRect(0, 0, _canvas_width, _canvas_height);
  // debugger;
  _img_ctx.drawImage(_current_image, 0, 0,
                         _canvas_width, _canvas_height);
  console.log("Drawn the image");
  // refresh the attributes panel
  update_attributes_panel();
  console.log("called update_attributes_panel");

  _load_canvas_regions(); // image to canvas space transform
  console.log("called _load_canvas_region");
  _redraw_reg_canvas();
  console.log("called _redraw_reg_canvas");
  _reg_canvas.focus();
  console.log("Focused on the _reg_canvas");

      // var id;
      // url = "/api/get_context_data/"
      // data = {'bookname': book_name};
      // console.log(url)
      // $.ajax({
      //     type:"POST",
      //     url: url,
      //     data: data,
      //     headers: {"X-CSRFToken": $("#secty").val()},
      //     success: function (response){
      //       console.log("");
      //   // redirect to url
      //       window.location = "/edit/?bookid=" + response.book_id
      //     }
      //   });
//   var img_reader = new FileReader();
//   _is_loading_current_image = true;

//   img_reader.addEventListener( "loadstart", function(e) {
//     img_loading_spinbar(true);
//   }, false);

//   img_reader.addEventListener( "progress", function(e) {
//   }, false);

//   img_reader.addEventListener( "error", function() {
//     _is_loading_current_image = false;
//     img_loading_spinbar(false);
//     show_message("Error loading image " + img_filename + " !");
//   }, false);

//   img_reader.addEventListener( "abort", function() {
//     _is_loading_current_image = false;
//     img_loading_spinbar(false);
//     show_message("Aborted loading image " + img_filename + " !");
//   }, false);

//   img_reader.addEventListener( "load", function() {
//     _current_image = new Image();

//     _current_image.addEventListener( "error", function() {
//       _is_loading_current_image = false;
//       img_loading_spinbar(false);
//       show_message("Error loading image " + img_filename + " !");
//     }, false);

//     _current_image.addEventListener( "abort", function() {
//       _is_loading_current_image = false;
//       img_loading_spinbar(false);
//       show_message("Aborted loading image " + img_filename + " !");
//     }, false);

//     _current_image.addEventListener( "load", function() {

//       // update the current state of application
//       _image_id = img_id;
//       _image_index = image_index;
//       _current_image_filename = img_filename;
//       _current_image_loaded = true;
//       _is_loading_current_image = false;
//       _click_x0 = 0; _click_y0 = 0;
//       _click_x1 = 0; _click_y1 = 0;
//       _is_user_drawing_region = false;
//       _is_window_resized = false;
//       _is_user_resizing_region = false;
//       _is_user_moving_region = false;
//       _is_user_drawing_polygon = false;
//       _is_region_selected = false;
//       _user_sel_region_id = -1;
//       _current_image_width = _current_image.naturalWidth;
//       _current_image_height = _current_image.naturalHeight;
//       console.log(_image_id , _image_index , _current_image_filename , _current_image_width, _current_image_height);
      
//       // set the size of canvas
//       // based on the current dimension of browser window
//       var de = document.documentElement;
//       var canvas_panel_width = de.clientWidth - 100;
//       var canvas_panel_height = de.clientHeight - 100;
//       _canvas_width = _current_image_width;
//       _canvas_height = _current_image_height;
//       if ( _canvas_width > canvas_panel_width ) {
//         // resize image to match the panel width
//         var scale_width = canvas_panel_width / _current_image.naturalWidth;
//         _canvas_width = canvas_panel_width;
//         _canvas_height = _current_image.naturalHeight * scale_width;
//       }
//       if ( _canvas_height > canvas_panel_height ) {
//         // resize further image if its height is larger than the image panel
//         var scale_height = canvas_panel_height / _canvas_height;
//         _canvas_height = canvas_panel_height;
//         _canvas_width = _canvas_width * scale_height;
//       }
//       _canvas_width = Math.round(_canvas_width);
//       _canvas_height = Math.round(_canvas_height);
//       _canvas_scale = _current_image.naturalWidth / _canvas_width;
//       _canvas_scale_without_zoom = _canvas_scale;
//       set_all_canvas_size(_canvas_width, _canvas_height);
//       //set_all_canvas_scale(_canvas_scale_without_zoom);
//       console.log("current image is >>>" + _current_image);
//       // ensure that all the canvas are visible
//       clear_image_display_area();
//       show_all_canvas();

//       // we only need to draw the image once in the image_canvas
//       _img_ctx.clearRect(0, 0, _canvas_width, _canvas_height);
//       _img_ctx.drawImage(_current_image, 0, 0,
//                              _canvas_width, _canvas_height);
//       console.log("got invoked");
//       // refresh the attributes panel
//       update_attributes_panel();

//       _load_canvas_regions(); // image to canvas space transform
//       _redraw_reg_canvas();
//       _reg_canvas.focus();

//       img_loading_spinbar(false);


//       // update the UI components to reflect newly loaded image
//       // refresh the image list
//       // @todo: let the height of image list match that of window
//       _reload_img_table = true;
//       var img_list_height = document.documentElement.clientHeight/3 + 'px';
//       img_list_panel.setAttribute('style', 'height: ' + img_list_height);
//       if (_is_loaded_img_list_visible) {
//         show_img_list();
//       }
//     });
//     _current_image.src = img_reader.result;
//   }, false);

//   if (_img_metadata[img_id].base64_img_data === '') {
//     // load image from file
//     console.log(typeof(_img_metadata[img_id]));
//     debugger;
//     img_reader.readAsDataURL(_img_metadata);
//   } else {
//     // load image from base64 data or URL
//     img_reader.readAsText( new Blob([_img_metadata[img_id].base64_img_data]) );
//   }
}

// transform regions in image space to canvas space
function _load_canvas_regions() {
  // load all existing annotations into _canvas_regions
  var regions = _img_metadata[_image_id].regions;
  _canvas_regions  = [];
  for ( var i = 0; i < regions.length; ++i ) {
    var region_i = new ImageRegion();
    for ( var key in regions[i].shape_attributes ) {
      region_i.shape_attributes[key] = regions[i].shape_attributes[key];
    }
    _canvas_regions.push(region_i);

    switch(_canvas_regions[i].shape_attributes['name']) {
    case _REGION_SHAPE.RECT:
      var x      = regions[i].shape_attributes['x'] / _canvas_scale;
      var y      = regions[i].shape_attributes['y'] / _canvas_scale;
      var width  = regions[i].shape_attributes['width']  / _canvas_scale;
      var height = regions[i].shape_attributes['height'] / _canvas_scale;

      _canvas_regions[i].shape_attributes['x'] = Math.round(x);
      _canvas_regions[i].shape_attributes['y'] = Math.round(y);
      _canvas_regions[i].shape_attributes['width'] = Math.round(width);
      _canvas_regions[i].shape_attributes['height'] = Math.round(height);
      break;

    case _REGION_SHAPE.CIRCLE:
      var cx = regions[i].shape_attributes['cx'] / _canvas_scale;
      var cy = regions[i].shape_attributes['cy'] / _canvas_scale;
      var r  = regions[i].shape_attributes['r']  / _canvas_scale;
      _canvas_regions[i].shape_attributes['cx'] = Math.round(cx);
      _canvas_regions[i].shape_attributes['cy'] = Math.round(cy);
      _canvas_regions[i].shape_attributes['r'] = Math.round(r);
      break;

    case _REGION_SHAPE.ELLIPSE:
      var cx = regions[i].shape_attributes['cx'] / _canvas_scale;
      var cy = regions[i].shape_attributes['cy'] / _canvas_scale;
      var rx = regions[i].shape_attributes['rx'] / _canvas_scale;
      var ry = regions[i].shape_attributes['ry'] / _canvas_scale;
      _canvas_regions[i].shape_attributes['cx'] = Math.round(cx);
      _canvas_regions[i].shape_attributes['cy'] = Math.round(cy);
      _canvas_regions[i].shape_attributes['rx'] = Math.round(rx);
      _canvas_regions[i].shape_attributes['ry'] = Math.round(ry);
      break;

    case _REGION_SHAPE.POLYGON:
      var all_points_x = regions[i].shape_attributes['all_points_x'].slice(0);
      var all_points_y = regions[i].shape_attributes['all_points_y'].slice(0);
      for (var j=0; j<all_points_x.length; ++j) {
        all_points_x[j] = Math.round(all_points_x[j] / _canvas_scale);
        all_points_y[j] = Math.round(all_points_y[j] / _canvas_scale);
      }
      _canvas_regions[i].shape_attributes['all_points_x'] = all_points_x;
      _canvas_regions[i].shape_attributes['all_points_y'] = all_points_y;
      break;

    case _REGION_SHAPE.POINT:
      var cx = regions[i].shape_attributes['cx'] / _canvas_scale;
      var cy = regions[i].shape_attributes['cy'] / _canvas_scale;

      _canvas_regions[i].shape_attributes['cx'] = Math.round(cx);
      _canvas_regions[i].shape_attributes['cy'] = Math.round(cy);
      break;
    }
  }
}

// updates currently selected region shape
function select_region_shape(sel_shape_name) {
  // console.log(sel_shape_name);

  if (!_is_reg_attr_panel_visible){
    for ( var shape_name in _REGION_SHAPE ) {
      var ui_element = document.getElementById('region_shape_' + _REGION_SHAPE[shape_name]);
      ui_element.classList.remove('selected');
    }

    _current_shape = sel_shape_name;
    var ui_element = document.getElementById('region_shape_' + _current_shape);
    ui_element.classList.add('selected');
  // console.log("switch");
    switch(_current_shape) {
    case _REGION_SHAPE.RECT: // Fall-through
    case _REGION_SHAPE.CIRCLE: // Fall-through
    case _REGION_SHAPE.ELLIPSE:
      show_message('Press single click and drag mouse to draw ' +
                   _current_shape + ' region');
      break;

    case _REGION_SHAPE.POLYGON:
      _is_user_drawing_polygon = false;
      _current_polygon_region_id = -1;

      show_message('Press single click to define polygon vertices and ' +
                   'click first vertex to close path');
      break;

    case _REGION_SHAPE.POINT:
      show_message('Press single click to define points (or landmarks)');
      break;

    default:
      show_message('Unknown shape selected!');
      break;
    }
    // console.log("selected");
  }
}

function set_all_canvas_size(w, h) {
  _img_canvas.height = h;
  _img_canvas.width  = w;

  _reg_canvas.height = h;
  _reg_canvas.width = w;

  canvas_panel.style.height = h + 'px';
  canvas_panel.style.width  = w + 'px';
}

function set_all_canvas_scale(s) {
  _img_ctx.scale(s, s);
  _reg_ctx.scale(s, s);
}

function show_all_canvas() {
  canvas_panel.style.display = 'inline-block';
}

function hide_all_canvas() {
  canvas_panel.style.display = 'none';
}

function toggle_img_list(panel) {
  if ( typeof panel === 'undefined' ) {
    // invoked from accordion in the top navigation toolbar
    panel = document.getElementById('loaded_img_panel');
  }
  panel.classList.toggle('active');

  if (_is_loaded_img_list_visible) {
    img_list_panel.style.display    = 'none';
    _is_loaded_img_list_visible = false;
  } else {
    _is_loaded_img_list_visible = true;
    show_img_list();
  }
}

function toggle_region_shape_list(panel) {

  if ( typeof panel === 'undefined' ) {
    // invoked from accordion in the top navigation toolbar
    panel = document.getElementById('region_shapes');
  }
  panel.classList.toggle('active');

  if (_is_region_shape_list_visible) {
    region_shape_list.style.display    = 'none';
    _is_region_shape_list_visible = false;
  } else {
    region_shape_list.style.display    = 'block';
    _is_region_shape_list_visible = true;
    // show_img_list();
  }

}

function show_img_list() {
  if (_img_count === 0) {
    show_message("Please load some images first!");
    return;
  }

  if(_is_loaded_img_list_visible && _current_image_loaded) {
    if ( _reload_img_table ) {
      reload_img_table();
      _reload_img_table = false;
    }
    img_list_panel.innerHTML = _loaded_img_table_html.join('');
    img_list_panel.style.display = 'block';

    // scroll img_list_panel automatically to show the current image filename
    var panel        = document.getElementById('img_list_panel');
    var html_img_id  = 'flist' + _image_index;
    var sel_file     = document.getElementById(html_img_id);
    var panel_height = panel.offsetHeight;
    if ( sel_file.offsetTop < panel.scrollTop ) {
      panel.scrollTop = sel_file.offsetTop;
    }
    if ( sel_file.offsetTop > panel_height/2 ) {
      panel.scrollTop = sel_file.offsetTop - panel_height/2;
    }
  }
}

function reload_img_table() {
  _loaded_img_fn_list = [];
  _loaded_img_region_attr_miss_count = [];

  for ( var i=0; i < _img_count; ++i ) {
    var img_id = _image_id_list[i];
    _loaded_img_fn_list[i] = _img_metadata[img_id].filename;
    _loaded_img_region_attr_miss_count[i] = count_missing_region_attr(img_id);
  }

  _loaded_img_table_html = [];
  _loaded_img_table_html.push('<ul>');
  for ( var i=0; i < _img_count; ++i ) {
    var fni = '';
    if ( i === _image_index ) {
      // highlight the current entry
      fni += '<li id="flist'+i+'" style="cursor: default;" title="' + _loaded_img_fn_list[i] + '">';
      fni += '<b>[' + (i+1) + '] ' + _loaded_img_fn_list[i] + '</b>';
    } else {
      fni += '<li id="flist'+i+'" onclick="jump_to_image(' + (i) + ')" title="' + _loaded_img_fn_list[i] + '">';
      fni += '[' + (i+1) + '] ' + _loaded_img_fn_list[i];
    }

    if ( _loaded_img_region_attr_miss_count[i] ) {
      fni += ' (' + '<span style="color: red;">';
      fni += _loaded_img_region_attr_miss_count[i] + '</span>' + ')';
    }

    fni += '</li>';
    _loaded_img_table_html.push(fni);
  }
  _loaded_img_table_html.push('</ul>');
}

function jump_to_image(image_index) {
  if ( _img_count <= 0 ) {
    return;
  }

  // reset zoom
  if ( _is_canvas_zoomed ) {
    _is_canvas_zoomed = false;
    _canvas_zoom_level_index = _CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;
    var zoom_scale = _CANVAS_ZOOM_LEVELS[_canvas_zoom_level_index];
    set_all_canvas_scale(zoom_scale);
    set_all_canvas_size(_canvas_width, _canvas_height);
    _canvas_scale = _canvas_scale_without_zoom;
  }

  if ( image_index >= 0 && image_index < _img_count) {
    show_image(image_index);
  }
}

function count_missing_region_attr(img_id) {
  var miss_region_attr_count = 0;
  var attr_count = Object.keys(_region_attributes).length;
  for( var i=0; i < _img_metadata[img_id].regions.length; ++i ) {
    var set_attr_count = Object.keys(_img_metadata[img_id].regions[i].region_attributes).length;
    miss_region_attr_count += ( attr_count - set_attr_count );
  }
  return miss_region_attr_count;
}

function count_missing_file_attr(img_id) {
  return Object.keys(_file_attributes).length - Object.keys(_img_metadata[img_id].file_attributes).length;
}

function toggle_all_regions_selection(is_selected) {
  for (var i=0; i<_canvas_regions.length; ++i) {
    _canvas_regions[i].is_user_selected = is_selected;
    _img_metadata[_image_id].regions[i].is_user_selected = is_selected;
  }
  _is_all_region_selected = is_selected;
}
function select_only_region(region_id) {
  toggle_all_regions_selection(false);
  set_region_select_state(region_id, true);
  _is_region_selected = true;
  _user_sel_region_id = region_id;
}
function set_region_select_state(region_id, is_selected) {
  _canvas_regions[region_id].is_user_selected = is_selected;
  _img_metadata[_image_id].regions[region_id].is_user_selected = is_selected;
}
function toggle_accordion_panel(e) {
  /*e.classList.toggle('active');
  e.nextElementSibling.classList.toggle('show');*/
  // console.log("edit");
}

function img_loading_spinbar(show) {
  var panel = document.getElementById('loaded_img_panel');
  if ( show ) {
    // panel.innerHTML = 'Loaded Images &nbsp;&nbsp;';
  } else {
    // panel.innerHTML = 'Loaded Images &nbsp;&nbsp;';
  }
}

function toggle_leftsidebar() {
  var leftsidebar = document.getElementById('leftsidebar');
  if ( leftsidebar.style.display === 'none' ) {
    leftsidebar.style.display = 'table-cell';
    document.getElementById('leftsidebar_collapse_button').innerHTML ='&ltrif;';
  } else {
    leftsidebar.style.display = 'none';
    document.getElementById('leftsidebar_collapse_button').innerHTML ='&rtrif;';
  }
}

function show_annotation_data() {
  var hstr = '<pre>' + pack_metadata('csv').join('') + '</pre>';


  var url = "/api/get_annotations/"
  var data = {'annotation': hstr};
  console.log("sending annotation request");
  $.ajax({
        type:"GET",
        url: url,
        async: false,
        cache: false,
        timeout: 30000,
        data: data,
        success: function (response){
          console.log("annotated data sent");
        },
        error: function(errorThrown){
          swal("OOPS!","Looks like there was an error: " + errorThrown, "error");
        }
      });
  if ( typeof annotation_data_window === 'undefined' || typeof annotation_data_window.document === 'undefined') {
    var window_features = 'toolbar=no,menubar=no,location=no,resizable=yes,scrollbars=yes,status=no';
    window_features += ',width=800,height=600';
    annotation_data_window = window.open('', 'Image Metadata ', window_features);
  }
   annotation_data_window.document.body.innerHTML = hstr;
}


function show_modal_for_attribute(){
  // window.alert("Hi new region");
}



//
// Image click handlers
//

function update_eventListeners(){

// enter annotation mode on double click
_reg_canvas.addEventListener('dblclick', function(e) {
  _click_x0 = e.offsetX; _click_y0 = e.offsetY;
  var region_id = is_inside_region(_click_x0, _click_y0);

  if (region_id !== -1) {
    // user clicked inside a region, show attribute panel\
    if(!_is_reg_attr_panel_visible) {
      toggle_reg_attr_panel();
    }
  }

}, false);

// user clicks on the canvas
_reg_canvas.addEventListener('mousedown', function(e) {
  _click_x0 = e.offsetX; _click_y0 = e.offsetY;
  _region_edge = is_on_region_corner(_click_x0, _click_y0);
  var region_id = is_inside_region(_click_x0, _click_y0);
  //console.log(region_id);

  if ( _is_region_selected ) {
    // check if user clicked on the region boundary
    if ( _region_edge[1] > 0 ) {
      if ( !_is_user_resizing_region ) {
        // resize region
        if ( _region_edge[0] !== _user_sel_region_id ) {
          _user_sel_region_id = _region_edge[0];
        }
        _is_user_resizing_region = true;
      }
    } else {
      var yes = is_inside_this_region(_click_x0,
                                      _click_y0,
                                      _user_sel_region_id);
      if (yes) {
        if( !_is_user_moving_region ) {
          _is_user_moving_region = true;
          _region_click_x = _click_x0;
          _region_click_y = _click_y0;
        }
      }
      if ( region_id === -1 ) {
        // mousedown on outside any region
        _is_user_drawing_region = true;
        // unselect all regions
        _is_region_selected = false;
        _user_sel_region_id = -1;
        toggle_all_regions_selection(false);
      }
    }
  } else {
    if ( region_id === -1 ) {
      // mousedown outside a region
      if (_current_shape !== _REGION_SHAPE.POLYGON &&
          _current_shape !== _REGION_SHAPE.POINT) {
        // this is a bounding box drawing event
        _is_user_drawing_region = true;
      }
    } else {
      // mousedown inside a region
      // this could lead to (1) region selection or (2) region drawing
      _is_user_drawing_region = true;
    }
  }
  e.preventDefault();
}, false);

// implements the following functionalities:
//  - new region drawing (including polygon)
//  - moving/resizing/select/unselect existing region
_reg_canvas.addEventListener('mouseup', function(e) {
  _click_x1 = e.offsetX; _click_y1 = e.offsetY;

  var click_dx = Math.abs(_click_x1 - _click_x0);
  var click_dy = Math.abs(_click_y1 - _click_y0);

  // indicates that user has finished moving a region
  if ( _is_user_moving_region ) {
    _is_user_moving_region = false;
    _reg_canvas.style.cursor = "default";

    var move_x = Math.round(_click_x1 - _region_click_x);
    var move_y = Math.round(_click_y1 - _region_click_y);

    if (Math.abs(move_x) > _MOUSE_CLICK_TOL ||
        Math.abs(move_y) > _MOUSE_CLICK_TOL) {

      var image_attr = _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes;
      var canvas_attr = _canvas_regions[_user_sel_region_id].shape_attributes;

      switch( canvas_attr['name'] ) {
      case _REGION_SHAPE.RECT:
        var xnew = image_attr['x'] + Math.round(move_x * _canvas_scale);
        var ynew = image_attr['y'] + Math.round(move_y * _canvas_scale);
        image_attr['x'] = xnew;
        image_attr['y'] = ynew;

        canvas_attr['x'] = Math.round( image_attr['x'] / _canvas_scale);
        canvas_attr['y'] = Math.round( image_attr['y'] / _canvas_scale);
        break;

      case _REGION_SHAPE.CIRCLE: // Fall-through
      case _REGION_SHAPE.ELLIPSE: // Fall-through
      case _REGION_SHAPE.POINT:
        var cxnew = image_attr['cx'] + Math.round(move_x * _canvas_scale);
        var cynew = image_attr['cy'] + Math.round(move_y * _canvas_scale);
        image_attr['cx'] = cxnew;
        image_attr['cy'] = cynew;

        canvas_attr['cx'] = Math.round( image_attr['cx'] / _canvas_scale);
        canvas_attr['cy'] = Math.round( image_attr['cy'] / _canvas_scale);
        break;

      case _REGION_SHAPE.POLYGON:
        var img_px = image_attr['all_points_x'];
        var img_py = image_attr['all_points_y'];
        for (var i=0; i<img_px.length; ++i) {
          img_px[i] = img_px[i] + Math.round(move_x * _canvas_scale);
          img_py[i] = img_py[i] + Math.round(move_y * _canvas_scale);
        }

        var canvas_px = canvas_attr['all_points_x'];
        var canvas_py = canvas_attr['all_points_y'];
        for (var i=0; i<canvas_px.length; ++i) {
          canvas_px[i] = Math.round( img_px[i] / _canvas_scale );
          canvas_py[i] = Math.round( img_py[i] / _canvas_scale );
        }
        break;
      }
    } else {
      // indicates a user click on an already selected region
      // this could indicate a user's intention to select another
      // nested region within this region

      // traverse the canvas regions in alternating ascending
      // and descending order to solve the issue of nested regions
      nested_region_id = is_inside_region(_click_x0, _click_y0, true);
      if (nested_region_id >= 0 &&
          nested_region_id !== _user_sel_region_id) {
        _user_sel_region_id = nested_region_id;
        _is_region_selected = true;
        _is_user_moving_region = false;

        _current_type = _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type;


      //   switch(_current_type){
      //   case 'text':
      //     _THEME_SEL_REGION_FILL_COLOR = '#66ff99';
      //     break;
      //   case 'graphic':
      //     _THEME_SEL_REGION_FILL_COLOR = '#ff0000';
      //     break;
      //   case 'equation':
      //     _THEME_SEL_REGION_FILL_COLOR = '#0000ff';
      //     break;
      //   case 'title':
      //     _THEME_SEL_REGION_FILL_COLOR = '#ffff00';
      //     break;
      // }

      for (var key in legendList){
        if( _current_type === key){
          _THEME_SEL_REGION_FILL_COLOR = legendList[key];
          break;
        }
      }

        // de-select all other regions if the user has not pressed Shift
        if ( !e.shiftKey ) {
          toggle_all_regions_selection(false);
        }
        set_region_select_state(nested_region_id, true);
        update_attributes_panel();
      }
    }
    _redraw_reg_canvas();
    _reg_canvas.focus();
    save_current_data_to_browser_cache();
    return;
  }

  // indicates that user has finished resizing a region
  if ( _is_user_resizing_region ) {
    // _click(x0,y0) to _click(x1,y1)
    _is_user_resizing_region = false;
    _reg_canvas.style.cursor = "default";

    // update the region
    var region_id = _region_edge[0];
    var image_attr = _img_metadata[_image_id].regions[region_id].shape_attributes;
    var canvas_attr = _canvas_regions[region_id].shape_attributes;

    switch (canvas_attr['name']) {
    case _REGION_SHAPE.RECT:
      var d = [canvas_attr['x'], canvas_attr['y'], 0, 0];
      d[2] = d[0] + canvas_attr['width'];
      d[3] = d[1] + canvas_attr['height'];

      var mx = _current_x;
      var my = _current_y;
      var preserve_aspect_ratio = false;

      // constrain (mx,my) to lie on a line connecting a diagonal of rectangle
      if ( _is_ctrl_pressed ) {
        preserve_aspect_ratio = true;
      }

      rect_update_corner(_region_edge[1], d, mx, my, preserve_aspect_ratio);
      rect_standardize_coordinates(d);

      var w = Math.abs(d[2] - d[0]);
      var h = Math.abs(d[3] - d[1]);

      image_attr['x'] = Math.round(d[0] * _canvas_scale);
      image_attr['y'] = Math.round(d[1] * _canvas_scale);
      image_attr['width'] = Math.round(w * _canvas_scale);
      image_attr['height'] = Math.round(h * _canvas_scale);

      canvas_attr['x'] = Math.round( image_attr['x'] / _canvas_scale);
      canvas_attr['y'] = Math.round( image_attr['y'] / _canvas_scale);
      canvas_attr['width'] = Math.round( image_attr['width'] / _canvas_scale);
      canvas_attr['height'] = Math.round( image_attr['height'] / _canvas_scale);
      break;

    case _REGION_SHAPE.CIRCLE:
      var dx = Math.abs(canvas_attr['cx'] - _current_x);
      var dy = Math.abs(canvas_attr['cy'] - _current_y);
      var new_r = Math.sqrt( dx*dx + dy*dy );

      image_attr['r'] = Math.round(new_r * _canvas_scale);
      canvas_attr['r'] = Math.round( image_attr['r'] / _canvas_scale);
      break;

    case _REGION_SHAPE.ELLIPSE:
      var new_rx = canvas_attr['rx'];
      var new_ry = canvas_attr['ry'];
      var dx = Math.abs(canvas_attr['cx'] - _current_x);
      var dy = Math.abs(canvas_attr['cy'] - _current_y);

      switch(_region_edge[1]) {
      case 5:
        new_ry = dy;
        break;

      case 6:
        new_rx = dx;
        break;

      default:
        new_rx = dx;
        new_ry = dy;
        break;
      }

      image_attr['rx'] = Math.round(new_rx * _canvas_scale);
      image_attr['ry'] = Math.round(new_ry * _canvas_scale);

      canvas_attr['rx'] = Math.round(image_attr['rx'] / _canvas_scale);
      canvas_attr['ry'] = Math.round(image_attr['ry'] / _canvas_scale);
      break;

    case _REGION_SHAPE.POLYGON:
      var moved_vertex_id = _region_edge[1] - _POLYGON_RESIZE_VERTEX_OFFSET;

      var imx = Math.round(_current_x * _canvas_scale);
      var imy = Math.round(_current_y * _canvas_scale);
      image_attr['all_points_x'][moved_vertex_id] = imx;
      image_attr['all_points_y'][moved_vertex_id] = imy;
      canvas_attr['all_points_x'][moved_vertex_id] = Math.round( imx / _canvas_scale );
      canvas_attr['all_points_y'][moved_vertex_id] = Math.round( imy / _canvas_scale );

      if (moved_vertex_id === 0) {
        // move both first and last vertex because we
        // the initial point at the end to close path
        var n = canvas_attr['all_points_x'].length;
        image_attr['all_points_x'][n-1] = imx;
        image_attr['all_points_y'][n-1] = imy;
        canvas_attr['all_points_x'][n-1] = Math.round( imx / _canvas_scale );
        canvas_attr['all_points_y'][n-1] = Math.round( imy / _canvas_scale );
      }
      break;
    }

    _redraw_reg_canvas();
    _reg_canvas.focus();
    save_current_data_to_browser_cache();
    return;
  }

  // denotes a single click (= mouse down + mouse up)
  if ( click_dx < _MOUSE_CLICK_TOL ||
       click_dy < _MOUSE_CLICK_TOL ) {
    // if user is already drawing polygon, then each click adds a new point
    if ( _is_user_drawing_polygon ) {
      var canvas_x0 = Math.round(_click_x0);
      var canvas_y0 = Math.round(_click_y0);

      // check if the clicked point is close to the first point
      var fx0 = _canvas_regions[_current_polygon_region_id].shape_attributes['all_points_x'][0];
      var fy0 = _canvas_regions[_current_polygon_region_id].shape_attributes['all_points_y'][0];
      var  dx = (fx0 - canvas_x0);
      var  dy = (fy0 - canvas_y0);
      if ( Math.sqrt(dx*dx + dy*dy) <= _POLYGON_VERTEX_MATCH_TOL ) {
        // user clicked on the first polygon point to close the path
        _is_user_drawing_polygon = false;

        // add all polygon points stored in _canvas_regions[]
        var all_points_x = _canvas_regions[_current_polygon_region_id].shape_attributes['all_points_x'].slice(0);
        var all_points_y = _canvas_regions[_current_polygon_region_id].shape_attributes['all_points_y'].slice(0);
        // close path
        all_points_x.push(all_points_x[0]);
        all_points_y.push(all_points_y[0]);

        var canvas_all_points_x = [];
        var canvas_all_points_y = [];

        //var points_str = '';
        for ( var i=0; i<all_points_x.length; ++i ) {
          all_points_x[i] = Math.round( all_points_x[i] * _canvas_scale );
          all_points_y[i] = Math.round( all_points_y[i] * _canvas_scale );

          canvas_all_points_x[i] = Math.round( all_points_x[i] / _canvas_scale );
          canvas_all_points_y[i] = Math.round( all_points_y[i] / _canvas_scale );

          //points_str += all_points_x[i] + ' ' + all_points_y[i] + ',';
        }
        //points_str = points_str.substring(0, points_str.length-1); // remove last comma

        var polygon_region = new ImageRegion();
        polygon_region.shape_attributes['name'] = 'polygon';
        //polygon_region.shape_attributes['points'] = points_str;
        polygon_region.shape_attributes['all_points_x'] = all_points_x;
        polygon_region.shape_attributes['all_points_y'] = all_points_y;
        _current_polygon_region_id = _img_metadata[_image_id].regions.length;
        _img_metadata[_image_id].regions.push(polygon_region);

        // update canvas
        _canvas_regions[_current_polygon_region_id].shape_attributes['all_points_x'] = canvas_all_points_x;
        _canvas_regions[_current_polygon_region_id].shape_attributes['all_points_y'] = canvas_all_points_y;

        // newly drawn region is automatically selected
        select_only_region(_current_polygon_region_id);

        _current_polygon_region_id = -1;
        update_attributes_panel();
        save_current_data_to_browser_cache();
      } else {
        // user clicked on a new polygon point
        _canvas_regions[_current_polygon_region_id].shape_attributes['all_points_x'].push(canvas_x0);
        _canvas_regions[_current_polygon_region_id].shape_attributes['all_points_y'].push(canvas_y0);
      }
    } else {
      var region_id = is_inside_region(_click_x0, _click_y0);
      _cur_region_id = region_id;
      //console.log(region_id);
      //console.log(_img_metadata[_image_id].regions);
      /*if(_cur_region_id != -1){
      _current_type = _img_metadata[_image_id].regions[region_id].shape_attributes.type;
      }
      //console.log(_current_type);
      switch(_current_type){
        case 'text':
          _THEME_SEL_REGION_FILL_COLOR = '#66ff99';
          break;
        case 'graphic':
          _THEME_SEL_REGION_FILL_COLOR = '#ff0000';
          break;
        case 'equation':
          _THEME_SEL_REGION_FILL_COLOR = '#0000ff';
          break;
        case 'title':
          _THEME_SEL_REGION_FILL_COLOR = '#ffff00';
          break;
      }*/
      if ( region_id >= 0 ) {
        // first click selects region
        _user_sel_region_id     = region_id;
        _is_region_selected     = true;
        _is_user_moving_region  = false;
        _is_user_drawing_region = false;

      if(_user_sel_region_id != -1){
      _current_type = _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type;
      }
      //console.log(_current_type);
      // switch(_current_type){
      //   case 'text':
      //     _THEME_SEL_REGION_FILL_COLOR = '#66ff99';
      //     break;
      //   case 'graphic':
      //     _THEME_SEL_REGION_FILL_COLOR = '#ff0000';
      //     break;
      //   case 'equation':
      //     _THEME_SEL_REGION_FILL_COLOR = '#0000ff';
      //     break;
      //   case 'title':
      //     _THEME_SEL_REGION_FILL_COLOR = '#ffff00';
      //     break;
      // }

      for (var key in legendList){
        if( _current_type === key){
          _THEME_SEL_REGION_FILL_COLOR = legendList[key];
          break;
        }
      }

        // de-select all other regions if the user has not pressed Shift
        if ( !e.shiftKey ) {
          toggle_all_regions_selection(false);
        }
        set_region_select_state(region_id, true);
        update_attributes_panel();
        //show_message('Click and drag to move or resize the selected region');
      } else {
        if ( _is_user_drawing_region ) {
          // clear all region selection
          _is_user_drawing_region = false;
          _is_region_selected     = false;
          toggle_all_regions_selection(false);

          update_attributes_panel();
        } else {
          switch (_current_shape) {
          case _REGION_SHAPE.POLYGON:
            // user has clicked on the first point in a new polygon
            _is_user_drawing_polygon = true;

            var canvas_polygon_region = new ImageRegion();
            canvas_polygon_region.shape_attributes['name'] = _REGION_SHAPE.POLYGON;
            canvas_polygon_region.shape_attributes['all_points_x'] = [Math.round(_click_x0)];
            canvas_polygon_region.shape_attributes['all_points_y'] = [Math.round(_click_y0)];
            _canvas_regions.push(canvas_polygon_region);
            _current_polygon_region_id =_canvas_regions.length - 1;
            break;

          case _REGION_SHAPE.POINT:
            // user has marked a landmark point
            var point_region = new ImageRegion();
            point_region.shape_attributes['name'] = _REGION_SHAPE.POINT;
            point_region.shape_attributes['cx'] = Math.round(_click_x0 * _canvas_scale);
            point_region.shape_attributes['cy'] = Math.round(_click_y0 * _canvas_scale);
            _img_metadata[_image_id].regions.push(point_region);

            var canvas_point_region = new ImageRegion();
            canvas_point_region.shape_attributes['name'] = _REGION_SHAPE.POINT;
            canvas_point_region.shape_attributes['cx'] = Math.round(_click_x0);
            canvas_point_region.shape_attributes['cy'] = Math.round(_click_y0);
            _canvas_regions.push(canvas_point_region);

            update_attributes_panel();
            save_current_data_to_browser_cache();
            break;
          }
        }
      }
    }
    _redraw_reg_canvas();
    _reg_canvas.focus();
    return;
  }

  // indicates that user has finished drawing a new region
  if ( _is_user_drawing_region ) {

    _is_user_drawing_region = false;

    var region_x0, region_y0, region_x1, region_y1;
    // ensure that (x0,y0) is top-left and (x1,y1) is bottom-right
    if ( _click_x0 < _click_x1 ) {
      region_x0 = _click_x0;
      region_x1 = _click_x1;
    } else {
      region_x0 = _click_x1;
      region_x1 = _click_x0;
    }

    if ( _click_y0 < _click_y1 ) {
      region_y0 = _click_y0;
      region_y1 = _click_y1;
    } else {
      region_y0 = _click_y1;
      region_y1 = _click_y0;
    }

    var original_img_region = new ImageRegion();
    var canvas_img_region = new ImageRegion();
    var region_dx = Math.abs(region_x1 - region_x0);
    var region_dy = Math.abs(region_y1 - region_y0);

    // newly drawn region is automatically selected
    toggle_all_regions_selection(false);
    original_img_region.is_user_selected = true;
    canvas_img_region.is_user_selected = true;
    _is_region_selected = true;
    _user_sel_region_id = _canvas_regions.length; // new region's id

    if ( region_dx > _REGION_MIN_DIM ||
      region_dy > _REGION_MIN_DIM ) { // avoid regions with 0 dim
      switch(_current_shape) {
      case _REGION_SHAPE.RECT:
        var x = Math.round(region_x0 * _canvas_scale);
        var y = Math.round(region_y0 * _canvas_scale);
        var width  = Math.round(region_dx * _canvas_scale);
        var height = Math.round(region_dy * _canvas_scale);
        original_img_region.shape_attributes['name'] = 'rect';
        original_img_region.shape_attributes['x'] = x;
        original_img_region.shape_attributes['y'] = y;
        original_img_region.shape_attributes['width'] = width;
        original_img_region.shape_attributes['height'] = height;

        canvas_img_region.shape_attributes['name'] = 'rect';
        canvas_img_region.shape_attributes['x'] = Math.round( x / _canvas_scale );
        canvas_img_region.shape_attributes['y'] = Math.round( y / _canvas_scale );
        canvas_img_region.shape_attributes['width'] = Math.round( width / _canvas_scale );
        canvas_img_region.shape_attributes['height'] = Math.round( height / _canvas_scale );

        _img_metadata[_image_id].regions.push(original_img_region);
        console.log(_img_metadata[_image_id].regions)
        _canvas_regions.push(canvas_img_region);
        break;

      case _REGION_SHAPE.CIRCLE:
        var cx = Math.round(region_x0 * _canvas_scale);
        var cy = Math.round(region_y0 * _canvas_scale);
        var r  = Math.round( Math.sqrt(region_dx*region_dx + region_dy*region_dy) * _canvas_scale );

        original_img_region.shape_attributes['name'] = 'circle';
        original_img_region.shape_attributes['cx'] = cx;
        original_img_region.shape_attributes['cy'] = cy;
        original_img_region.shape_attributes['r'] = r;

        canvas_img_region.shape_attributes['name'] = 'circle';
        canvas_img_region.shape_attributes['cx'] = Math.round( cx / _canvas_scale );
        canvas_img_region.shape_attributes['cy'] = Math.round( cy / _canvas_scale );
        canvas_img_region.shape_attributes['r'] = Math.round( r / _canvas_scale );

        _img_metadata[_image_id].regions.push(original_img_region);
        _canvas_regions.push(canvas_img_region);
        break;

      case _REGION_SHAPE.ELLIPSE:
        var cx = Math.round(region_x0 * _canvas_scale);
        var cy = Math.round(region_y0 * _canvas_scale);
        var rx = Math.round(region_dx * _canvas_scale);
        var ry = Math.round(region_dy * _canvas_scale);

        original_img_region.shape_attributes['name'] = 'ellipse';
        original_img_region.shape_attributes['cx'] = cx;
        original_img_region.shape_attributes['cy'] = cy;
        original_img_region.shape_attributes['rx'] = rx;
        original_img_region.shape_attributes['ry'] = ry;

        canvas_img_region.shape_attributes['name'] = 'ellipse';
        canvas_img_region.shape_attributes['cx'] = Math.round( cx / _canvas_scale );
        canvas_img_region.shape_attributes['cy'] = Math.round( cy / _canvas_scale );
        canvas_img_region.shape_attributes['rx'] = Math.round( rx / _canvas_scale );
        canvas_img_region.shape_attributes['ry'] = Math.round( ry / _canvas_scale );

        _img_metadata[_image_id].regions.push(original_img_region);
        _canvas_regions.push(canvas_img_region);
        break;

      case _REGION_SHAPE.POLYGON:
        // handled by _is_user_drawing polygon
        break;
      }
      console.log("at the end of updateEventListers");
      console.log(_img_metadata[_image_id]);

      show_modal_for_attribute();
    }
     else {
      show_message('Cannot add such a small region');
    }


    update_attributes_panel();
    _redraw_reg_canvas();
    _reg_canvas.focus();

    perform_ocr();

    save_current_data_to_browser_cache();
    return;
  }

});

/*_reg_canvas.addEventListener("mouseover", function(e) {
  // change the mouse cursor icon
  _redraw_reg_canvas();
  _reg_canvas.focus();
});*/

_reg_canvas.addEventListener('mousemove', function(e) {
  if ( !_current_image_loaded ) {
    return;
  }

  _current_x = e.offsetX; _current_y = e.offsetY;

  if ( _is_region_selected ) {
    if ( !_is_user_resizing_region ) {
      // check if user moved mouse cursor to region boundary
      // which indicates an intention to resize the region

      _region_edge = is_on_region_corner(_current_x, _current_y);

      if ( _region_edge[0] === _user_sel_region_id ) {
        switch(_region_edge[1]) {
          // rect
        case 1: // Fall-through // top-left corner of rect
        case 3: // bottom-right corner of rect
          _reg_canvas.style.cursor = "nwse-resize";
          break;
        case 2: // Fall-through // top-right corner of rect
        case 4: // bottom-left corner of rect
          _reg_canvas.style.cursor = "nesw-resize";
          break;

          // circle and ellipse
        case 5:
          _reg_canvas.style.cursor = "n-resize";
          break;
        case 6:
          _reg_canvas.style.cursor = "e-resize";
          break;

        default:
          _reg_canvas.style.cursor = "default";
          break;
        }

        if (_region_edge[1] >= _POLYGON_RESIZE_VERTEX_OFFSET) {
          // indicates mouse over polygon vertex
          _reg_canvas.style.cursor = "crosshair";
        }
      } else {
        var yes = is_inside_this_region(_current_x,
                                        _current_y,
                                        _user_sel_region_id);
        if (yes) {
          _reg_canvas.style.cursor = "move";
        } else {
          _reg_canvas.style.cursor = "default";
        }
      }
    }
  }

  if(_is_user_drawing_region) {
    // draw region as the user drags the mouse cursor
    if (_canvas_regions.length) {
      _redraw_reg_canvas(); // clear old intermediate rectangle
    } else {
      // first region being drawn, just clear the full region canvas
      _reg_ctx.clearRect(0, 0, _reg_canvas.width, _reg_canvas.height);
    }

    var region_x0, region_y0;

    if ( _click_x0 < _current_x ) {
      if ( _click_y0 < _current_y ) {
        region_x0 = _click_x0;
        region_y0 = _click_y0;
      } else {
        region_x0 = _click_x0;
        region_y0 = _current_y;
      }
    } else {
      if ( _click_y0 < _current_y ) {
        region_x0 = _current_x;
        region_y0 = _click_y0;
      } else {
        region_x0 = _current_x;
        region_y0 = _current_y;
      }
    }
    var dx = Math.round(Math.abs(_current_x - _click_x0));
    var dy = Math.round(Math.abs(_current_y - _click_y0));

    switch (_current_shape ) {
    case _REGION_SHAPE.RECT:
      _draw_rect_region(region_x0, region_y0, dx, dy, true);
      break;

    case _REGION_SHAPE.CIRCLE:
      var circle_radius = Math.round(Math.sqrt( dx*dx + dy*dy ));
      _draw_circle_region(region_x0, region_y0, circle_radius, true);
      break;

    case _REGION_SHAPE.ELLIPSE:
      _draw_ellipse_region(region_x0, region_y0, dx, dy, true);
      break;

    case _REGION_SHAPE.POLYGON:
      // this is handled by the if ( _is_user_drawing_polygon ) { ... }
      // see below
      break;
    }
    _reg_canvas.focus();
  }

  if ( _is_user_resizing_region ) {
    // user has clicked mouse on bounding box edge and is now moving it
    // draw region as the user drags the mouse coursor
    if (_canvas_regions.length) {
      _redraw_reg_canvas(); // clear old intermediate rectangle
    } else {
      // first region being drawn, just clear the full region canvas
      _reg_ctx.clearRect(0, 0, _reg_canvas.width, _reg_canvas.height);
    }

    var region_id = _region_edge[0];
    var attr = _canvas_regions[region_id].shape_attributes;
    switch (attr['name']) {
    case _REGION_SHAPE.RECT:
      // original rectangle
      var d = [attr['x'], attr['y'], 0, 0];
      d[2] = d[0] + attr['width'];
      d[3] = d[1] + attr['height'];

      var mx = _current_x;
      var my = _current_y;
      var preserve_aspect_ratio = false;

      // constrain (mx,my) to lie on a line connecting a diagonal of rectangle
      if ( _is_ctrl_pressed ) {
        preserve_aspect_ratio = true;
      }

      rect_update_corner(_region_edge[1], d, mx, my, preserve_aspect_ratio);
      rect_standardize_coordinates(d);

      var w = Math.abs(d[2] - d[0]);
      var h = Math.abs(d[3] - d[1]);
      _draw_rect_region(d[0], d[1], w, h, true);
      break;

    case _REGION_SHAPE.CIRCLE:
      var dx = Math.abs(attr['cx'] - _current_x);
      var dy = Math.abs(attr['cy'] - _current_y);
      var new_r = Math.sqrt( dx*dx + dy*dy );
      _draw_circle_region(attr['cx'],
                              attr['cy'],
                              new_r,
                              true);
      break;

    case _REGION_SHAPE.ELLIPSE:
      var new_rx = attr['rx'];
      var new_ry = attr['ry'];
      var dx = Math.abs(attr['cx'] - _current_x);
      var dy = Math.abs(attr['cy'] - _current_y);
      switch(_region_edge[1]) {
      case 5:
        new_ry = dy;
        break;

      case 6:
        new_rx = dx;
        break;

      default:
        new_rx = dx;
        new_ry = dy;
        break;
      }
      _draw_ellipse_region(attr['cx'],
                               attr['cy'],
                               new_rx,
                               new_ry,
                               true);
      break;

    case _REGION_SHAPE.POLYGON:
      var moved_all_points_x = attr['all_points_x'].slice(0);
      var moved_all_points_y = attr['all_points_y'].slice(0);
      var moved_vertex_id = _region_edge[1] - _POLYGON_RESIZE_VERTEX_OFFSET;

      moved_all_points_x[moved_vertex_id] = _current_x;
      moved_all_points_y[moved_vertex_id] = _current_y;

      if (moved_vertex_id === 0) {
        // move both first and last vertex because we
        // the initial point at the end to close path
        moved_all_points_x[moved_all_points_x.length-1] = _current_x;
        moved_all_points_y[moved_all_points_y.length-1] = _current_y;
      }

      _draw_polygon_region(moved_all_points_x,
                               moved_all_points_y,
                               true);
      break;
    }
    _reg_canvas.focus();
  }

  if ( _is_user_moving_region ) {
    // draw region as the user drags the mouse coursor
    if (_canvas_regions.length) {
      _redraw_reg_canvas(); // clear old intermediate rectangle
    } else {
      // first region being drawn, just clear the full region canvas
      _reg_ctx.clearRect(0, 0, _reg_canvas.width, _reg_canvas.height);
    }

    var move_x = (_current_x - _region_click_x);
    var move_y = (_current_y - _region_click_y);
    var attr = _canvas_regions[_user_sel_region_id].shape_attributes;

    switch (attr['name']) {
    case _REGION_SHAPE.RECT:
      _draw_rect_region(attr['x'] + move_x,
                            attr['y'] + move_y,
                            attr['width'],
                            attr['height'],
                            true);
      break;

    case _REGION_SHAPE.CIRCLE:
      _draw_circle_region(attr['cx'] + move_x,
                              attr['cy'] + move_y,
                              attr['r'],
                              true);
      break;

    case _REGION_SHAPE.ELLIPSE:
      _draw_ellipse_region(attr['cx'] + move_x,
                               attr['cy'] + move_y,
                               attr['rx'],
                               attr['ry'],
                               true);
      break;

    case _REGION_SHAPE.POLYGON:
      var moved_all_points_x = attr['all_points_x'].slice(0);
      var moved_all_points_y = attr['all_points_y'].slice(0);
      for (var i=0; i<moved_all_points_x.length; ++i) {
        moved_all_points_x[i] += move_x;
        moved_all_points_y[i] += move_y;
      }
      _draw_polygon_region(moved_all_points_x,
                               moved_all_points_y,
                               true);
      break;

    case _REGION_SHAPE.POINT:
      _draw_point_region(attr['cx'] + move_x,
                             attr['cy'] + move_y,
                             true);
      break;
    }
    _reg_canvas.focus();
    return;
  }

  if ( _is_user_drawing_polygon ) {
    _redraw_reg_canvas();
    var attr = _canvas_regions[_current_polygon_region_id].shape_attributes;
    var all_points_x = attr['all_points_x'];
    var all_points_y = attr['all_points_y'];
    var npts = all_points_x.length;

    var line_x = [all_points_x.slice(npts-1), _current_x];
    var line_y = [all_points_y.slice(npts-1), _current_y];
    _draw_polygon_region(line_x, line_y, true);
  }
});

}
//
// Canvas update routines
//
function _redraw_img_canvas() {
  if (_current_image_loaded) {
    _img_ctx.clearRect(0, 0, _img_canvas.width, _img_canvas.height);
    _img_ctx.drawImage(_current_image, 0, 0,
                           _img_canvas.width, _img_canvas.height);
  }
}

function _redraw_reg_canvas() {
  if (_current_image_loaded) {
    if ( _canvas_regions.length > 0 ) {
      _reg_ctx.clearRect(0, 0, _reg_canvas.width, _reg_canvas.height);
      if (_is_region_boundary_visible) {
        draw_all_regions();
      }

      if (_is_region_id_visible) {
        draw_all_region_id();
      }
    }
  }
}

function _clear_reg_canvas() {
  _reg_ctx.clearRect(0, 0, _reg_canvas.width, _reg_canvas.height);
}

function draw_all_regions() {
  for (var i=0; i < _canvas_regions.length; ++i) {
    var attr = _canvas_regions[i].shape_attributes;
    _cur_reg_drawing_id = i;
    var is_selected = _canvas_regions[i].is_user_selected;

    switch( attr['name'] ) {
    case _REGION_SHAPE.RECT:
      _draw_rect_region(attr['x'],
                            attr['y'],
                            attr['width'],
                            attr['height'],
                            is_selected);
      break;

    case _REGION_SHAPE.CIRCLE:
      _draw_circle_region(attr['cx'],
                              attr['cy'],
                              attr['r'],
                              is_selected);
      break;

    case _REGION_SHAPE.ELLIPSE:
      _draw_ellipse_region(attr['cx'],
                               attr['cy'],
                               attr['rx'],
                               attr['ry'],
                               is_selected);
      break;

    case _REGION_SHAPE.POLYGON:
      _draw_polygon_region(attr['all_points_x'],
                               attr['all_points_y'],
                               is_selected);
      break;

    case _REGION_SHAPE.POINT:
      _draw_point_region(attr['cx'],
                             attr['cy'],
                             is_selected);
      break;
    }
  }
}

//Handlers for changing the regions type

function change_region_text(){
  console.log("called change_region_text");
  _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type = 'text';
  _current_type = _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type;
  switch(_current_type){
        case 'text':
          _THEME_SEL_REGION_FILL_COLOR = '#66ff99';
          break;
        case 'graphic':
          _THEME_SEL_REGION_FILL_COLOR = '#ff0000';
          break;
        case 'equation':
          _THEME_SEL_REGION_FILL_COLOR = '#0000ff';
          break;
        case 'title':
          _THEME_SEL_REGION_FILL_COLOR = '#ffff00';
          break;
      }
  _redraw_reg_canvas();
}

function change_region_graphic(){
  _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type = 'graphic';
  _current_type = _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type;
  switch(_current_type){
        case 'text':
          _THEME_SEL_REGION_FILL_COLOR = '#66ff99';
          break;
        case 'graphic':
          _THEME_SEL_REGION_FILL_COLOR = '#ff0000';
          break;
        case 'equation':
          _THEME_SEL_REGION_FILL_COLOR = '#0000ff';
          break;
        case 'title':
          _THEME_SEL_REGION_FILL_COLOR = '#ffff00';
          break;
      }
  _redraw_reg_canvas();
}

function change_region_equation(){
  _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type = 'equation';
  _current_type = _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type;
  switch(_current_type){
        case 'text':
          _THEME_SEL_REGION_FILL_COLOR = '#66ff99';
          break;
        case 'graphic':
          _THEME_SEL_REGION_FILL_COLOR = '#ff0000';
          break;
        case 'equation':
          _THEME_SEL_REGION_FILL_COLOR = '#0000ff';
          break;
        case 'title':
          _THEME_SEL_REGION_FILL_COLOR = '#ffff00';
          break;
      }
  _redraw_reg_canvas();
}

function change_region_title(){
  _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type = 'title';
  _current_type = _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type;
  switch(_current_type){
        case 'text':
          _THEME_SEL_REGION_FILL_COLOR = '#66ff99';
          break;
        case 'graphic':
          _THEME_SEL_REGION_FILL_COLOR = '#ff0000';
          break;
        case 'equation':
          _THEME_SEL_REGION_FILL_COLOR = '#0000ff';
          break;
        case 'title':
          _THEME_SEL_REGION_FILL_COLOR = '#ffff00';
          break;
      }
  _redraw_reg_canvas();
}

function change_region(region_type){
  console.log("inside change_region with region_type =", region_type);
  _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type = region_type;
  _current_type = _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type;
  _THEME_SEL_REGION_FILL_COLOR = legendList[region_type]
  _redraw_reg_canvas();
  update_region_attributes_input_panel();
}

// control point for resize of region boundaries
function _draw_control_point(cx, cy) {
  _reg_ctx.beginPath();
  _reg_ctx.arc(cx, cy, _REGION_POINT_RADIUS, 0, 2*Math.PI, false);
  _reg_ctx.closePath();

  _reg_ctx.fillStyle = _THEME_CONTROL_POINT_COLOR;
  _reg_ctx.globalAlpha = 1.0;
  _reg_ctx.fill();
}

function _draw_rect_region(x, y, w, h, is_selected) {
  if (is_selected) {
    /*_current_type = _img_metadata[_image_id].regions[_user_sel_region_id].shape_attributes.type;
    switch(_current_type){
        case 'text':
          _THEME_SEL_REGION_FILL_COLOR = '#66ff99';
          break;
        case 'graphic':
          _THEME_SEL_REGION_FILL_COLOR = '#ff0000';
          break;
        case 'equation':
          _THEME_SEL_REGION_FILL_COLOR = '#0000ff';
          break;
        case 'title':
          _THEME_SEL_REGION_FILL_COLOR = '#ffff00';
          break;
      }*/
    _draw_rect(x, y, w, h);

    _reg_ctx.strokeStyle = _THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
    _reg_ctx.stroke();

    _reg_ctx.fillStyle   = _THEME_SEL_REGION_FILL_COLOR;
    _reg_ctx.globalAlpha = _THEME_SEL_REGION_OPACITY;
    _reg_ctx.fill();
    _reg_ctx.globalAlpha = 1.0;

    _draw_control_point(x  ,   y);
    _draw_control_point(x+w, y+h);
    _draw_control_point(x  , y+h);
    _draw_control_point(x+w,   y);
  } else {
    // draw a fill line
    _current_type = _img_metadata[_image_id].regions[_cur_reg_drawing_id].shape_attributes.type;
    _THEME_BOUNDARY_FILL_COLOR = legendList[_current_type]
    // switch(_current_type){
    //     case 'text':
    //       _THEME_BOUNDARY_FILL_COLOR = '#66ff99';
    //       break;
    //     case 'graphic':
    //       _THEME_BOUNDARY_FILL_COLOR = '#ff0000';
    //       break;
    //     case 'equation':
    //       _THEME_BOUNDARY_FILL_COLOR = '#0000ff';
    //       break;
    //     case 'title':
    //       _THEME_BOUNDARY_FILL_COLOR = '#ffff00';
    //       break;
    //   }
    _reg_ctx.strokeStyle = _THEME_BOUNDARY_FILL_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
    _draw_rect(x, y, w, h);
    _reg_ctx.stroke();

    if ( w > _THEME_REGION_BOUNDARY_WIDTH &&
         h > _THEME_REGION_BOUNDARY_WIDTH ) {
      // draw a boundary line on both sides of the fill line
      _reg_ctx.strokeStyle = _THEME_BOUNDARY_LINE_COLOR;
      _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/4;
      _draw_rect(x - _THEME_REGION_BOUNDARY_WIDTH/2,
                     y - _THEME_REGION_BOUNDARY_WIDTH/2,
                     w + _THEME_REGION_BOUNDARY_WIDTH,
                     h + _THEME_REGION_BOUNDARY_WIDTH);
      _reg_ctx.stroke();

      _draw_rect(x + _THEME_REGION_BOUNDARY_WIDTH/2,
                     y + _THEME_REGION_BOUNDARY_WIDTH/2,
                     w - _THEME_REGION_BOUNDARY_WIDTH,
                     h - _THEME_REGION_BOUNDARY_WIDTH);
      _reg_ctx.stroke();
    }
  }
}

function _draw_rect(x, y, w, h) {
  _reg_ctx.beginPath();
  _reg_ctx.moveTo(x  , y);
  _reg_ctx.lineTo(x+w, y);
  _reg_ctx.lineTo(x+w, y+h);
  _reg_ctx.lineTo(x  , y+h);
  _reg_ctx.closePath();
}

function _draw_circle_region(cx, cy, r, is_selected) {
  if (is_selected) {
    _draw_circle(cx, cy, r);

    _reg_ctx.strokeStyle = _THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
    _reg_ctx.stroke();

    _reg_ctx.fillStyle   = _THEME_SEL_REGION_FILL_COLOR;
    _reg_ctx.globalAlpha = _THEME_SEL_REGION_OPACITY;
    _reg_ctx.fill();
    _reg_ctx.globalAlpha = 1.0;

    _draw_control_point(cx + r, cy);
  } else {
    // draw a fill line
    _current_type = _img_metadata[_image_id].regions[_cur_reg_drawing_id].shape_attributes.type;
    _THEME_BOUNDARY_FILL_COLOR = legendList[_current_type]
    // switch(_current_type){
    //     case 'text':
    //       _THEME_BOUNDARY_FILL_COLOR = '#66ff99';
    //       break;
    //     case 'graphic':
    //       _THEME_BOUNDARY_FILL_COLOR = '#ff0000';
    //       break;
    //     case 'equation':
    //       _THEME_BOUNDARY_FILL_COLOR = '#0000ff';
    //       break;
    //     case 'title':
    //       _THEME_BOUNDARY_FILL_COLOR = '#ffff00';
    //       break;
    //   }
    _reg_ctx.strokeStyle = _THEME_BOUNDARY_FILL_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
    _draw_circle(cx, cy, r);
    _reg_ctx.stroke();

    if ( r > _THEME_REGION_BOUNDARY_WIDTH ) {
      // draw a boundary line on both sides of the fill line
      _reg_ctx.strokeStyle = _THEME_BOUNDARY_LINE_COLOR;
      _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/4;
      _draw_circle(cx, cy,
                       r - _THEME_REGION_BOUNDARY_WIDTH/2);
      _reg_ctx.stroke();
      _draw_circle(cx, cy,
                       r + _THEME_REGION_BOUNDARY_WIDTH/2);
      _reg_ctx.stroke();
    }
  }
}

function _draw_circle(cx, cy, r) {
  _reg_ctx.beginPath();
  _reg_ctx.arc(cx, cy, r, 0, 2*Math.PI, false);
  _reg_ctx.closePath();
}

function _draw_ellipse_region(cx, cy, rx, ry, is_selected) {
  if (is_selected) {
    _draw_ellipse(cx, cy, rx, ry);

    _reg_ctx.strokeStyle = _THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
    _reg_ctx.stroke();

    _reg_ctx.fillStyle   = _THEME_SEL_REGION_FILL_COLOR;
    _reg_ctx.globalAlpha = _THEME_SEL_REGION_OPACITY;
    _reg_ctx.fill();
    _reg_ctx.globalAlpha = 1.0;

    _draw_control_point(cx + rx, cy);
    _draw_control_point(cx     , cy - ry);
  } else {
    // draw a fill line
    _current_type = _img_metadata[_image_id].regions[_cur_reg_drawing_id].shape_attributes.type;
    _THEME_BOUNDARY_FILL_COLOR = legendList[_current_type]
    // switch(_current_type){
    //     case 'text':
    //       _THEME_BOUNDARY_FILL_COLOR = '#66ff99';
    //       break;
    //     case 'graphic':
    //       _THEME_BOUNDARY_FILL_COLOR = '#ff0000';
    //       break;
    //     case 'equation':
    //       _THEME_BOUNDARY_FILL_COLOR = '#0000ff';
    //       break;
    //     case 'title':
    //       _THEME_BOUNDARY_FILL_COLOR = '#ffff00';
    //       break;
    //   }
    _reg_ctx.strokeStyle = _THEME_BOUNDARY_FILL_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
    _draw_ellipse(cx, cy, rx, ry);
    _reg_ctx.stroke();

    if ( rx > _THEME_REGION_BOUNDARY_WIDTH &&
         ry > _THEME_REGION_BOUNDARY_WIDTH ) {
      // draw a boundary line on both sides of the fill line
      _reg_ctx.strokeStyle = _THEME_BOUNDARY_LINE_COLOR;
      _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/4;
      _draw_ellipse(cx, cy,
                        rx + _THEME_REGION_BOUNDARY_WIDTH/2,
                        ry + _THEME_REGION_BOUNDARY_WIDTH/2);
      _reg_ctx.stroke();
      _draw_ellipse(cx, cy,
                        rx - _THEME_REGION_BOUNDARY_WIDTH/2,
                        ry - _THEME_REGION_BOUNDARY_WIDTH/2);
      _reg_ctx.stroke();
    }
  }
}

function _draw_ellipse(cx, cy, rx, ry) {
  _reg_ctx.save();

  _reg_ctx.beginPath();
  _reg_ctx.translate(cx-rx, cy-ry);
  _reg_ctx.scale(rx, ry);
  _reg_ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);

  _reg_ctx.restore(); // restore to original state
  _reg_ctx.closePath();

}

function _draw_polygon_region(all_points_x, all_points_y, is_selected) {
  if ( is_selected ) {
    _reg_ctx.beginPath();
    _reg_ctx.moveTo(all_points_x[0], all_points_y[0]);
    for ( var i=1; i < all_points_x.length; ++i ) {
      _reg_ctx.lineTo(all_points_x[i], all_points_y[i]);
    }
    _reg_ctx.strokeStyle = _THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
    _reg_ctx.stroke();

    _reg_ctx.fillStyle   = _THEME_SEL_REGION_FILL_COLOR;
    _reg_ctx.globalAlpha = _THEME_SEL_REGION_OPACITY;
    _reg_ctx.fill();
    _reg_ctx.globalAlpha = 1.0;

    for ( var i=1; i < all_points_x.length; ++i ) {
      _draw_control_point(all_points_x[i], all_points_y[i]);
    }
  } else {
    for ( var i=1; i < all_points_x.length; ++i ) {
      // draw a fill line
      /*_current_type = _img_metadata[_image_id].regions[_cur_reg_drawing_id].shape_attributes.type;
      switch(_current_type){
        case 'text':
          _THEME_BOUNDARY_FILL_COLOR = '#66ff99';
          break;
        case 'graphic':
          _THEME_BOUNDARY_FILL_COLOR = '#ff0000';
          break;
        case 'equation':
          _THEME_BOUNDARY_FILL_COLOR = '#0000ff';
          break;
        case 'title':
          _THEME_BOUNDARY_FILL_COLOR = '#ffff00';
          break;
      }*/
      _THEME_BOUNDARY_FILL_COLOR   = "#aaeeff";
      _reg_ctx.strokeStyle = _THEME_BOUNDARY_FILL_COLOR;
      _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
      _reg_ctx.beginPath();
      _reg_ctx.moveTo(all_points_x[i-1], all_points_y[i-1]);
      _reg_ctx.lineTo(all_points_x[i]  , all_points_y[i]);
      _reg_ctx.stroke();

      var slope_i = (all_points_y[i] - all_points_y[i-1]) / (all_points_x[i] - all_points_x[i-1]);
      if ( slope_i > 0 ) {
        // draw a boundary line on both sides
        _reg_ctx.strokeStyle = _THEME_BOUNDARY_LINE_COLOR;
        _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/4;
        _reg_ctx.beginPath();
        _reg_ctx.moveTo(parseInt(all_points_x[i-1]) - parseInt(_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i-1]) + parseInt(_THEME_REGION_BOUNDARY_WIDTH/4));
        _reg_ctx.lineTo(parseInt(all_points_x[i]) - parseInt(_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i]) + parseInt(_THEME_REGION_BOUNDARY_WIDTH/4));
        _reg_ctx.stroke();
        _reg_ctx.beginPath();
        _reg_ctx.moveTo(parseInt(all_points_x[i-1]) + parseInt(_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i-1]) - parseInt(_THEME_REGION_BOUNDARY_WIDTH/4));
        _reg_ctx.lineTo(parseInt(all_points_x[i]) + parseInt(_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i]) - parseInt(_THEME_REGION_BOUNDARY_WIDTH/4));
        _reg_ctx.stroke();
      } else {
        // draw a boundary line on both sides
        _reg_ctx.strokeStyle = _THEME_BOUNDARY_LINE_COLOR;
        _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/4;
        _reg_ctx.beginPath();
        _reg_ctx.moveTo(parseInt(all_points_x[i-1]) + parseInt(_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i-1]) + parseInt(_THEME_REGION_BOUNDARY_WIDTH/4));
        _reg_ctx.lineTo(parseInt(all_points_x[i]) + parseInt(_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i]) + parseInt(_THEME_REGION_BOUNDARY_WIDTH/4));
        _reg_ctx.stroke();
        _reg_ctx.beginPath();
        _reg_ctx.moveTo(parseInt(all_points_x[i-1]) - parseInt(_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i-1]) - parseInt(_THEME_REGION_BOUNDARY_WIDTH/4));
        _reg_ctx.lineTo(parseInt(all_points_x[i]) - parseInt(_THEME_REGION_BOUNDARY_WIDTH/4),
                            parseInt(all_points_y[i]) - parseInt(_THEME_REGION_BOUNDARY_WIDTH/4));
        _reg_ctx.stroke();
      }
    }
  }
}

function _draw_point_region(cx, cy, is_selected) {
  if (is_selected) {
    _draw_point(cx, cy, _REGION_POINT_RADIUS);

    _reg_ctx.strokeStyle = _THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
    _reg_ctx.stroke();

    _reg_ctx.fillStyle   = _THEME_SEL_REGION_FILL_COLOR;
    _reg_ctx.globalAlpha = _THEME_SEL_REGION_OPACITY;
    _reg_ctx.fill();
    _reg_ctx.globalAlpha = 1.0;
  } else {
    // draw a fill line
    _reg_ctx.strokeStyle = _THEME_BOUNDARY_FILL_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/2;
    _draw_point(cx, cy, _REGION_POINT_RADIUS);
    _reg_ctx.stroke();

    // draw a boundary line on both sides of the fill line
    _reg_ctx.strokeStyle = _THEME_BOUNDARY_LINE_COLOR;
    _reg_ctx.lineWidth   = _THEME_REGION_BOUNDARY_WIDTH/4;
    _draw_point(cx, cy,
                    _REGION_POINT_RADIUS - _THEME_REGION_BOUNDARY_WIDTH/2);
    _reg_ctx.stroke();
    _draw_point(cx, cy,
                    _REGION_POINT_RADIUS + _THEME_REGION_BOUNDARY_WIDTH/2);
    _reg_ctx.stroke();
  }
}

function _draw_point(cx, cy, r) {
  _reg_ctx.beginPath();
  _reg_ctx.arc(cx, cy, r, 0, 2*Math.PI, false);
  _reg_ctx.closePath();
}

function draw_all_region_id() {
  _reg_ctx.shadowColor = "transparent";
  for ( var i = 0; i < _img_metadata[_image_id].regions.length; ++i ) {
    var canvas_reg = _canvas_regions[i];

    var bbox = get_region_bounding_box(canvas_reg);
    var x = bbox[0];
    var y = bbox[1];
    var w = Math.abs(bbox[2] - bbox[0]);
    _reg_ctx.font = _THEME_ATTRIBUTE_VALUE_FONT;

    var annotation_str  = (i+1).toString();
    var bgnd_rect_width = _reg_ctx.measureText(annotation_str).width * 2;

    var char_width  = _reg_ctx.measureText('M').width;
    var char_height = 1.8 * char_width;

    var r = _img_metadata[_image_id].regions[i].region_attributes;
    if ( Object.keys(r).length === 1 && w > (2*char_width) ) {
      // show the attribute value
      for (var key in r) {
        annotation_str = r[key];
      }
      var strw = _reg_ctx.measureText(annotation_str).width;

      if ( strw > w ) {
        // if text overflows, crop it
        var str_max     = Math.floor((w * annotation_str.length) / strw);
        annotation_str  = annotation_str.substr(0, str_max-1) + '.';
        bgnd_rect_width = w;
      } else {
        bgnd_rect_width = strw + char_width;
      }
    }

    if (canvas_reg.shape_attributes['name'] === _REGION_SHAPE.POLYGON) {
      // put label near the first vertex
      x = canvas_reg.shape_attributes['all_points_x'][0];
      y = canvas_reg.shape_attributes['all_points_y'][0];
    } else {
      // center the label
      x = x - (bgnd_rect_width/2 - w/2);
    }

    // first, draw a background rectangle first
    _reg_ctx.fillStyle = 'black';
    _reg_ctx.globalAlpha = 0.8;
    _reg_ctx.fillRect(Math.floor(x),
                          Math.floor(y - 1.1*char_height),
                          Math.floor(bgnd_rect_width),
                          Math.floor(char_height));

    // then, draw text over this background rectangle
    _reg_ctx.globalAlpha = 1.0;
    _reg_ctx.fillStyle = 'yellow';
    _reg_ctx.fillText(annotation_str,
                          Math.floor(x + 0.4*char_width),
                          Math.floor(y - 0.35*char_height));

  }
}

function get_region_bounding_box(region) {
  var d = region.shape_attributes;
  var bbox = new Array(4);

  switch( d['name'] ) {
  case 'rect':
    bbox[0] = d['x'];
    bbox[1] = d['y'];
    bbox[2] = d['x'] + d['width'];
    bbox[3] = d['y'] + d['height'];
    break;

  case 'circle':
    bbox[0] = d['cx'] - d['r'];
    bbox[1] = d['cy'] - d['r'];
    bbox[2] = d['cx'] + d['r'];
    bbox[3] = d['cy'] + d['r'];
    break;

  case 'ellipse':
    bbox[0] = d['cx'] - d['rx'];
    bbox[1] = d['cy'] - d['ry'];
    bbox[2] = d['cx'] + d['rx'];
    bbox[3] = d['cy'] + d['ry'];
    break;

  case 'polygon':
    var all_points_x = d['all_points_x'];
    var all_points_y = d['all_points_y'];

    var minx = Number.MAX_SAFE_INTEGER;
    var miny = Number.MAX_SAFE_INTEGER;
    var maxx = 0;
    var maxy = 0;
    for ( var i=0; i < all_points_x.length; ++i ) {
      if ( all_points_x[i] < minx ) {
        minx = all_points_x[i];
      }
      if ( all_points_x[i] > maxx ) {
        maxx = all_points_x[i];
      }
      if ( all_points_y[i] < miny ) {
        miny = all_points_y[i];
      }
      if ( all_points_y[i] > maxy ) {
        maxy = all_points_y[i];
      }
    }
    bbox[0] = minx;
    bbox[1] = miny;
    bbox[2] = maxx;
    bbox[3] = maxy;
    break;

  case 'point':
    bbox[0] = d['cx'] - _REGION_POINT_RADIUS;
    bbox[1] = d['cy'] - _REGION_POINT_RADIUS;
    bbox[2] = d['cx'] + _REGION_POINT_RADIUS;
    bbox[3] = d['cy'] + _REGION_POINT_RADIUS;
    break;
  }
  return bbox;
}

//
// Region collision routines
//
function is_inside_region(px, py, descending_order) {
  var N = _canvas_regions.length;
  if ( N === 0 ) {
    return -1;
  }
  var start, end, del;
  // traverse the canvas regions in alternating ascending
  // and descending order to solve the issue of nested regions
  if ( descending_order ) {
    start = N - 1;
    end   = -1;
    del   = -1;
  } else {
    start = 0;
    end   = N;
    del   = 1;
  }

  var i = start;
  while ( i !== end ) {
    var yes = is_inside_this_region(px, py, i);
    if (yes) {
      return i;
    }
    i = i + del;
  }
  return -1;
}

function is_inside_this_region(px, py, region_id) {
  var attr   = _canvas_regions[region_id].shape_attributes;
  var result = false;
  switch ( attr['name'] ) {
  case _REGION_SHAPE.RECT:
    result = is_inside_rect(attr['x'],
                            attr['y'],
                            attr['width'],
                            attr['height'],
                            px, py);
    break;

  case _REGION_SHAPE.CIRCLE:
    result = is_inside_circle(attr['cx'],
                              attr['cy'],
                              attr['r'],
                              px, py);
    break;

  case _REGION_SHAPE.ELLIPSE:
    result = is_inside_ellipse(attr['cx'],
                               attr['cy'],
                               attr['rx'],
                               attr['ry'],
                               px, py);
    break;

  case _REGION_SHAPE.POLYGON:
    result = is_inside_polygon(attr['all_points_x'],
                               attr['all_points_y'],
                               px, py);
    break;

  case _REGION_SHAPE.POINT:
    result = is_inside_point(attr['cx'],
                             attr['cy'],
                             px, py);
    break;
  }
  return result;
}

function is_inside_circle(cx, cy, r, px, py) {
  var dx = px - cx;
  var dy = py - cy;
  return (dx * dx + dy * dy) < r * r;
}

function is_inside_rect(x, y, w, h, px, py) {
  return px > x &&
    px < (x + w) &&
    py > y &&
    py < (y + h);
}

function is_inside_ellipse(cx, cy, rx, ry, px, py) {
  var dx = (cx - px);
  var dy = (cy - py);
  return ((dx * dx) / (rx * rx)) + ((dy * dy) / (ry * ry)) < 1;
}

// returns 0 when (px,py) is outside the polygon
// source: http://geomalgorithms.com/a03-_inclusion.html
function is_inside_polygon(all_points_x, all_points_y, px, py) {
  var wn = 0;    // the  winding number counter

  // loop through all edges of the polygon
  for ( var i = 0; i < all_points_x.length-1; ++i ) {   // edge from V[i] to  V[i+1]
    var is_left_value = is_left( all_points_x[i], all_points_y[i],
                                 all_points_x[i+1], all_points_y[i+1],
                                 px, py);

    if (all_points_y[i] <= py) {
      if (all_points_y[i+1]  > py && is_left_value > 0) {
        ++wn;
      }
    }
    else {
      if (all_points_y[i+1]  <= py && is_left_value < 0) {
        --wn;
      }
    }
  }
  if ( wn === 0 ) {
    return 0;
  }
  else {
    return 1;
  }
}

function is_inside_point(cx, cy, px, py) {
  var dx = px - cx;
  var dy = py - cy;
  var r2 = _POLYGON_VERTEX_MATCH_TOL * _POLYGON_VERTEX_MATCH_TOL;
  return (dx * dx + dy * dy) < r2;
}

// returns
// >0 if (x2,y2) lies on the left side of line joining (x0,y0) and (x1,y1)
// =0 if (x2,y2) lies on the line joining (x0,y0) and (x1,y1)
// >0 if (x2,y2) lies on the right side of line joining (x0,y0) and (x1,y1)
// source: http://geomalgorithms.com/a03-_inclusion.html
function is_left(x0, y0, x1, y1, x2, y2) {
  return ( ((x1 - x0) * (y2 - y0))  - ((x2 -  x0) * (y1 - y0)) );
}

function is_on_region_corner(px, py) {
  var _region_edge = [-1, -1]; // region_id, corner_id [top-left=1,top-right=2,bottom-right=3,bottom-left=4]

  for ( var i = 0; i < _canvas_regions.length; ++i ) {
    var attr = _canvas_regions[i].shape_attributes;
    var result = false;
    _region_edge[0] = i;

    switch ( attr['name'] ) {
    case _REGION_SHAPE.RECT:
      result = is_on_rect_edge(attr['x'],
                               attr['y'],
                               attr['width'],
                               attr['height'],
                               px, py);
      break;

    case _REGION_SHAPE.CIRCLE:
      result = is_on_circle_edge(attr['cx'],
                                 attr['cy'],
                                 attr['r'],
                                 px, py);
      break;

    case _REGION_SHAPE.ELLIPSE:
      result = is_on_ellipse_edge(attr['cx'],
                                  attr['cy'],
                                  attr['rx'],
                                  attr['ry'],
                                  px, py);
      break;

    case _REGION_SHAPE.POLYGON:
      result = is_on_polygon_vertex(attr['all_points_x'],
                                    attr['all_points_y'],
                                    px, py);
      break;

    case _REGION_SHAPE.POINT:
      // since there are no edges of a point
      result = 0;
      break;
    }

    if (result > 0) {
      _region_edge[1] = result;
      return _region_edge;
    }
  }
  _region_edge[0] = -1;
  return _region_edge;
}

function is_on_rect_edge(x, y, w, h, px, py) {
  var dx0 = Math.abs(x - px);
  var dy0 = Math.abs(y - py);
  var dx1 = Math.abs(x + w - px);
  var dy1 = Math.abs(y + h - py);

  //[top-left=1,top-right=2,bottom-right=3,bottom-left=4]
  if ( dx0 < _REGION_EDGE_TOL &&
       dy0 < _REGION_EDGE_TOL ) {
    return 1;
  }
  if ( dx1 < _REGION_EDGE_TOL &&
       dy0 < _REGION_EDGE_TOL ) {
    return 2;
  }
  if ( dx1 < _REGION_EDGE_TOL &&
       dy1 < _REGION_EDGE_TOL ) {
    return 3;
  }

  if ( dx0 < _REGION_EDGE_TOL &&
       dy1 < _REGION_EDGE_TOL ) {
    return 4;
  }
  return 0;
}

function is_on_circle_edge(cx, cy, r, px, py) {
  var dx = cx - px;
  var dy = cy - py;
  if ( Math.abs(Math.sqrt( dx*dx + dy*dy ) - r) < _REGION_EDGE_TOL ) {
    var theta = Math.atan2( py - cy, px - cx );
    if ( Math.abs(theta - (Math.PI/2)) < _THETA_TOL ||
         Math.abs(theta + (Math.PI/2)) < _THETA_TOL) {
      return 5;
    }
    if ( Math.abs(theta) < _THETA_TOL ||
         Math.abs(Math.abs(theta) - Math.PI) < _THETA_TOL) {
      return 6;
    }

    if ( theta > 0 && theta < (Math.PI/2) ) {
      return 1;
    }
    if ( theta > (Math.PI/2) && theta < (Math.PI) ) {
      return 4;
    }
    if ( theta < 0 && theta > -(Math.PI/2) ) {
      return 2;
    }
    if ( theta < -(Math.PI/2) && theta > -Math.PI ) {
      return 3;
    }
  } else {
    return 0;
  }
}

function is_on_ellipse_edge(cx, cy, rx, ry, px, py) {
  var dx = (cx - px)/rx;
  var dy = (cy - py)/ry;

  if ( Math.abs(Math.sqrt( dx*dx + dy*dy ) - 1) < _ELLIPSE_EDGE_TOL ) {
    var theta = Math.atan2( py - cy, px - cx );
    if ( Math.abs(theta - (Math.PI/2)) < _THETA_TOL ||
         Math.abs(theta + (Math.PI/2)) < _THETA_TOL) {
      return 5;
    }
    if ( Math.abs(theta) < _THETA_TOL ||
         Math.abs(Math.abs(theta) - Math.PI) < _THETA_TOL) {
      return 6;
    }
  } else {
    return 0;
  }
}

function is_on_polygon_vertex(all_points_x, all_points_y, px, py) {
  var n = all_points_x.length;
  for (var i=0; i<n; ++i) {
    if ( Math.abs(all_points_x[i] - px) < _POLYGON_VERTEX_MATCH_TOL &&
         Math.abs(all_points_y[i] - py) < _POLYGON_VERTEX_MATCH_TOL ) {
      return (_POLYGON_RESIZE_VERTEX_OFFSET+i);
    }
  }
  return 0;
}

function rect_standardize_coordinates(d) {
  // d[x0,y0,x1,y1]
  // ensures that (d[0],d[1]) is top-left corner while
  // (d[2],d[3]) is bottom-right corner
  if ( d[0] > d[2] ) {
    // swap
    var t = d[0];
    d[0] = d[2];
    d[2] = t;
  }

  if ( d[1] > d[3] ) {
    // swap
    var t = d[1];
    d[1] = d[3];
    d[3] = t;
  }
}

function rect_update_corner(corner_id, d, x, y, preserve_aspect_ratio) {
  // pre-condition : d[x0,y0,x1,y1] is standardized
  // post-condition : corner is moved ( d may not stay standardized )
  if (preserve_aspect_ratio) {
    switch(corner_id) {
    case 1: // Fall-through // top-left
    case 3: // bottom-right
      var dx = d[2] - d[0];
      var dy = d[3] - d[1];
      var norm = Math.sqrt( dx*dx + dy*dy );
      var nx = dx / norm; // x component of unit vector along the diagonal of rect
      var ny = dy / norm; // y component
      var proj = (x - d[0]) * nx + (y - d[1]) * ny;
      var proj_x = nx * proj;
      var proj_y = ny * proj;
      // constrain (mx,my) to lie on a line connecting (x0,y0) and (x1,y1)
      x = Math.round( d[0] + proj_x );
      y = Math.round( d[1] + proj_y );
      break;

    case 2: // Fall-through // top-right
    case 4: // bottom-left
      var dx = d[2] - d[0];
      var dy = d[1] - d[3];
      var norm = Math.sqrt( dx*dx + dy*dy );
      var nx = dx / norm; // x component of unit vector along the diagonal of rect
      var ny = dy / norm; // y component
      var proj = (x - d[0]) * nx + (y - d[3]) * ny;
      var proj_x = nx * proj;
      var proj_y = ny * proj;
      // constrain (mx,my) to lie on a line connecting (x0,y0) and (x1,y1)
      x = Math.round( d[0] + proj_x );
      y = Math.round( d[3] + proj_y );
      break;
    }
  }

  switch(corner_id) {
  case 1: // top-left
    d[0] = x;
    d[1] = y;
    break;

  case 3: // bottom-right
    d[2] = x;
    d[3] = y;
    break;

  case 2: // top-right
    d[2] = x;
    d[1] = y;
    break;

  case 4: // bottom-left
    d[0] = x;
    d[3] = y;
    break;
  }
}

// function _update_ui_components() {
//   if ( !_is_window_resized && _current_image_loaded ) {
//     show_message('Resizing window ...');
//     set_all_text_panel_display('none');
//     show_all_canvas();

//     _is_window_resized = true;
//     show_image(_image_index);

//     if (_is_canvas_zoomed) {
//       reset_zoom_level();
//     }
//   }
// }

function del_sel_regions() {
  if ( !_current_image_loaded ) {
    show_message('First load some images!');
    return;
  }

  var del_region_count = 0;
  if ( _is_all_region_selected ) {
    del_region_count = _canvas_regions.length;
    _canvas_regions.splice(0);
    _img_metadata[_image_id].regions.splice(0);
  } else {
    var sorted_sel_reg_id = [];
    for ( var i = 0; i < _canvas_regions.length; ++i ) {
      if ( _canvas_regions[i].is_user_selected ) {
        sorted_sel_reg_id.push(i);
      }
    }
    sorted_sel_reg_id.sort( function(a,b) {
      return (b-a);
    });
    for ( var i = 0; i < sorted_sel_reg_id.length; ++i ) {
      _canvas_regions.splice( sorted_sel_reg_id[i], 1);
      _img_metadata[_image_id].regions.splice( sorted_sel_reg_id[i], 1);
      del_region_count += 1;
    }
  }

  _is_all_region_selected = false;
  _is_region_selected     = false;
  _user_sel_region_id     = -1;

  if (_is_reg_attr_panel_visible)
      toggle_reg_attr_panel();

  if ( _canvas_regions.length === 0 ) {
    // all regions were deleted, hence clear region canvas
    _clear_reg_canvas();
  } else {
    _redraw_reg_canvas();
  }
  redraw_ocr();
  _reg_canvas.focus();
  update_attributes_panel();
  save_current_data_to_browser_cache();

  show_message('Deleted ' + del_region_count + ' selected regions');
}


function del_sel_and_toggle_regions() {
  if ( !_current_image_loaded ) {
    show_message('First load some images!');
    return;
  }

  var del_region_count = 0;
  if ( _is_all_region_selected ) {
    del_region_count = _canvas_regions.length;
    _canvas_regions.splice(0);
    _img_metadata[_image_id].regions.splice(0);
  } else {
    var sorted_sel_reg_id = [];
    for ( var i = 0; i < _canvas_regions.length; ++i ) {
      if ( _canvas_regions[i].is_user_selected ) {
        sorted_sel_reg_id.push(i);
      }
    }
    sorted_sel_reg_id.sort( function(a,b) {
      return (b-a);
    });
    var selected_num;
    if (sorted_sel_reg_id.length == 0){
      selected_num = _selected_while_input;
    }
    else{
      selected_num = sorted_sel_reg_id[0];
    }
    // for ( var i = 0; i < sorted_sel_reg_id.length; ++i ) {
      _canvas_regions.splice( selected_num, 1);
      _img_metadata[_image_id].regions.splice( selected_num, 1);
      del_region_count += 1;
    // }
  }

  _is_all_region_selected = false;
  _is_region_selected     = false;
  _user_sel_region_id     = -1;

  if (_is_reg_attr_panel_visible)
      toggle_reg_attr_panel();

  if ( _canvas_regions.length === 0 ) {
    // all regions were deleted, hence clear region canvas
    _clear_reg_canvas();
  } else {
    _redraw_reg_canvas();
  }
  _reg_canvas.focus();
  update_attributes_panel();
  save_current_data_to_browser_cache();

  show_message('Deleted ' + del_region_count + ' selected regions');
}

function sel_all_regions() {
  if (!_current_image_loaded) {
    show_message('First load some images!');
    return;
  }

  toggle_all_regions_selection(true);
  _is_all_region_selected = true;
  _redraw_reg_canvas();
}

function copy_sel_regions() {
  if (!_current_image_loaded) {
    show_message('First load some images!');
    return;
  }

  if (_is_region_selected ||
      _is_all_region_selected) {
    _copied_image_regions.splice(0);
    for ( var i = 0; i < _img_metadata[_image_id].regions.length; ++i ) {
      var img_region = _img_metadata[_image_id].regions[i];
      var canvas_region = _canvas_regions[i];
      if ( canvas_region.is_user_selected ) {
        _copied_image_regions.push( clone_image_region(img_region) );
      }
    }
    show_message('Copied ' + _copied_image_regions.length +
                 ' selected regions. Press Ctrl + v to paste');
  } else {
    show_message('Select a region first!');
  }
}

function paste_sel_regions() {
  if ( !_current_image_loaded ) {
    show_message('First load some images!');
    return;
  }

  if ( _copied_image_regions.length ) {
    var pasted_reg_count = 0;
    for ( var i = 0; i < _copied_image_regions.length; ++i ) {
      // ensure copied the regions are within this image's boundaries
      var bbox = get_region_bounding_box( _copied_image_regions[i] );
      if (bbox[2] < _current_image_width &&
          bbox[3] < _current_image_height) {
        var r = clone_image_region(_copied_image_regions[i]);
        _img_metadata[_image_id].regions.push(r);

        pasted_reg_count += 1;
      }
    }
    _load_canvas_regions();
    var discarded_reg_count = _copied_image_regions.length - pasted_reg_count;
    show_message('Pasted ' + pasted_reg_count + ' regions. ' +
                 'Discarded ' + discarded_reg_count + ' regions exceeding image boundary.');
    _redraw_reg_canvas();
    _reg_canvas.focus();
  } else {
    show_message('To paste a region, you first need to select a region and copy it!');
  }
}

function move_to_prev_image() {
  if (_img_count > 0) {
    _is_region_selected = false;
    _user_sel_region_id = -1;

    if (_is_canvas_zoomed) {
      _is_canvas_zoomed = false;
      _canvas_zoom_level_index = _CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;
      var zoom_scale = _CANVAS_ZOOM_LEVELS[_canvas_zoom_level_index];
      set_all_canvas_scale(zoom_scale);
      set_all_canvas_size(_canvas_width, _canvas_height);
      _canvas_scale = _canvas_scale_without_zoom;
    }

    var current_img_index = _image_index;
    if ( _image_index === 0 ) {
      show_image(_img_count - 1);
    } else {
      show_image(_image_index - 1);
    }

    if (typeof _hook_prev_image === 'function') {
      _hook_prev_image(current_img_index);
    }
  }
}

function move_to_next_image() {
  if (_img_count > 0) {
    _is_region_selected = false;
    _user_sel_region_id = -1;

    if (_is_canvas_zoomed) {
      _is_canvas_zoomed = false;
      _canvas_zoom_level_index = _CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;
      var zoom_scale = _CANVAS_ZOOM_LEVELS[_canvas_zoom_level_index];
      set_all_canvas_scale(zoom_scale);
      set_all_canvas_size(_canvas_width, _canvas_height);
      _canvas_scale = _canvas_scale_without_zoom;
    }

    var current_img_index = _image_index;
    if ( _image_index === (_img_count-1) ) {
      show_image(0);
    } else {
      show_image(_image_index + 1);
    }

    if (typeof _hook_next_image === 'function') {
      _hook_next_image(current_img_index);
    }
  }
}

function reset_zoom_level() {
  if (!_current_image_loaded) {
    show_message('First load some images!');
    return;
  }
  if (_is_canvas_zoomed) {
    _is_canvas_zoomed = false;
    _canvas_zoom_level_index = _CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;

    var zoom_scale = _CANVAS_ZOOM_LEVELS[_canvas_zoom_level_index];
    set_all_canvas_scale(zoom_scale);
    set_all_canvas_size(_canvas_width, _canvas_height);
    _canvas_scale = _canvas_scale_without_zoom;

    _load_canvas_regions(); // image to canvas space transform
    _redraw_img_canvas();
    _redraw_reg_canvas();
    _reg_canvas.focus();
    show_message('Zoom reset');
  } else {
    show_message('Cannot reset zoom because image zoom has not been applied!');
  }
}

function zoom_in() {
  if (!_current_image_loaded) {
    show_message('First load some images!');
    return;
  }

  if (_canvas_zoom_level_index === (_CANVAS_ZOOM_LEVELS.length-1)) {
    show_message('Further zoom-in not possible');
  } else {
    _canvas_zoom_level_index += 1;

    _is_canvas_zoomed = true;
    var zoom_scale = _CANVAS_ZOOM_LEVELS[_canvas_zoom_level_index];
    set_all_canvas_scale(zoom_scale);
    set_all_canvas_size(_canvas_width  * zoom_scale,
                        _canvas_height * zoom_scale);
    _canvas_scale = _canvas_scale_without_zoom / zoom_scale;

    _load_canvas_regions(); // image to canvas space transform
    _redraw_img_canvas();
    _redraw_reg_canvas();
    _reg_canvas.focus();
    show_message('Zoomed in to level ' + zoom_scale + 'X');
  }
}

function zoom_out() {
  if (!_current_image_loaded) {
    show_message('First load some images!');
    return;
  }

  if (_canvas_zoom_level_index === 0) {
    show_message('Further zoom-out not possible');
  } else {
    _canvas_zoom_level_index -= 1;

    _is_canvas_zoomed = true;
    var zoom_scale = _CANVAS_ZOOM_LEVELS[_canvas_zoom_level_index];
    set_all_canvas_scale(zoom_scale);
    set_all_canvas_size(_canvas_width  * zoom_scale,
                        _canvas_height * zoom_scale);
    _canvas_scale = _canvas_scale_without_zoom / zoom_scale;

    _load_canvas_regions(); // image to canvas space transform
    _redraw_img_canvas();
    _redraw_reg_canvas();
    _reg_canvas.focus();
    show_message('Zoomed out to level ' + zoom_scale + 'X');
  }
}

function toggle_region_boundary_visibility() {
  _is_region_boundary_visible = !_is_region_boundary_visible;
  _redraw_reg_canvas();
  _reg_canvas.focus();
}

function toggle_region_id_visibility() {
  _is_region_id_visible = !_is_region_id_visible;
  _redraw_reg_canvas();
  _reg_canvas.focus();
}


function check_local_storage() {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
  try {
    var x = '__storage_test__';
    localStorage.setItem(x, x);
    localStorage.removeItem(x);
    return true;
  }
  catch(e) {
    return false;
  }
}

function save_current_data_to_browser_cache() {
  setTimeout(function() {
    if ( _is_local_storage_available &&
         ! _is_save_ongoing) {
      try {
        _is_save_ongoing = true;
        var img_metadata = pack_metadata('json');
        var timenow = new Date().toUTCString();
        localStorage.setItem('_timestamp', timenow);
        localStorage.setItem('_img_metadata', img_metadata[0]);
        // save attributes
        var attr = [];
        for (var attribute in _region_attributes) {
          attr.push(attribute);
        }
        localStorage.setItem('_region_attributes', JSON.stringify(attr));
        _is_save_ongoing = false;
      } catch(err) {
        _is_save_ongoing = false;
        _is_local_storage_available = false;
        show_message('Failed to save annotation data to browser cache.');
        alert('Failed to save annotation data to browser cache.');
        console.log('Failed to save annotation data to browser cache');
        console.log(err.message);
      }
    }
  }, 1000);
}

function is_data_in_localStorage() {
  return localStorage.getItem('_timestamp') &&
    localStorage.getItem('_img_metadata');
}

function remove_data_from_localStorage() {
  if( check_local_storage() && is_data_in_localStorage() ) {
    localStorage.removeItem('_timestamp');
    localStorage.removeItem('_img_metadata');
  }
}

function show_localStorage_recovery_options() {
  try {
    var hstr = [];
    var saved_date = localStorage.getItem('_timestamp');
    var saved_data_size = localStorage.getItem('_img_metadata').length / 1024; // in Kb


    hstr.push('<div style="padding: 1em; border: 1px solid #cccccc;">');
    hstr.push('<h3 style="border-bottom: 1px solid #5599FF">Data Recovery from Browser Cache</h3>');
    hstr.push('<p>Annotation data from your previous session exists in this browser\'s cache :</h3>');
    hstr.push('<ul><li>Saved on : ' + saved_date + '</li>');
    hstr.push('<li>Size : ' + Math.round(saved_data_size) + ' KB</li>');
    hstr.push('</ul>');
    hstr.push('<a title="Save as JSON" style="cursor: pointer; color: blue;" onclick="download_localStorage_data(\'json\')" title="Recover annotation data">Save</a>');
    hstr.push('<a style="padding-left:2em; cursor: pointer; color: blue;" onclick="remove_data_from_localStorage(); show_home_panel();" title="Discard annotation data">Discard</a>');

    hstr.push('<p style="clear: left;"><b>If you continue, the cached data will be discarded!</b></p></div>');
    _start_info_panel.innerHTML += hstr.join('');
  } catch(err) {
    show_message('Failed to recover annotation data saved in browser cache.');
    console.log('Failed to recover annotation data saved in browser cache.');
    console.log(err.message);
  }
}

function download_localStorage_data(type) {
  var saved_date = new Date( localStorage.getItem('_timestamp') );

  var localStorage_data_blob = new Blob( [localStorage.getItem('_img_metadata')],
                                         {type: 'text/json;charset=utf-8'});

  save_data_to_local_file(localStorage_data_blob, '_browser_cache_' + saved_date + '.json');
}

//
// Handlers for attributes input panel (spreadsheet like user input panel)
//
function attr_input_focus(i) {
  if ( _is_reg_attr_panel_visible ) {
    select_only_region(i);
    _redraw_reg_canvas();
  }
  _is_user_updating_attribute_value=true;
}

function attr_input_blur(i) {
  if ( _is_reg_attr_panel_visible ) {
    set_region_select_state(i, false);
    _redraw_reg_canvas();
  }
  _is_user_updating_attribute_value=false;
}

// header is a Set()
// data is an array of Map() objects


function init_spreadsheet_input(type, col_headers, data, attr_id, row_names) {

  if ( typeof row_names === 'undefined' ) {
    var row_names = [];
    for ( var i = 0; i < data.length; ++i ) {
      row_names[i] = i+1;
    }
  }

  // console.log("type: " + type);
  // console.log(col_headers);
  // console.log(data);
  // console.log(row_names);
  // console.log(_region_attributes );
  var attrname = '';
  switch(type) {
  case 'region_attributes':
    attrname = 'Region Attributes';
    break;

  case 'file_attributes':
    attrname = 'File Attributes';
    break;
  }



  // if multiple regions are selected, show the selected regions first
  var sel_reg_list       = [];
  var remaining_reg_list = [];
  var all_reg_list       = [];
  var region_traversal_order = [];
  if (type === 'region_attributes') {
    // count number of selected regions
    for ( var i = 0; i < data.length; ++i ) {
      all_reg_list.push(i);
      if ( data[i].is_user_selected ) {
        sel_reg_list.push(i);
      } else {
        remaining_reg_list.push(i);
      }
    }
    if ( sel_reg_list.length > 1 ) {
      region_traversal_order = sel_reg_list.concat(remaining_reg_list);
    } else {
      region_traversal_order = all_reg_list;
    }



  var attrtable = document.createElement('table');
  attrtable.setAttribute('id', 'attributes_panel_table');
  var firstrow = attrtable.insertRow(0);

  // top-left cell
  var topleft_cell = firstrow.insertCell(0);
  topleft_cell.innerHTML = '';
  topleft_cell.style.border = 'none';

  // console.log("data---");
  // console.log(data);
  // console.log(type);
  // console.log(sel_reg_list);
  // console.log("----");

  // allow adding new attributes
  // console.log(type[0]);
  // firstrow.insertCell(-1).innerHTML = '<input type="text"' +
  //   ' onchange="add_new_attribute(\'' + type[0] + '\', this.value)"' +
  //   ' value = "[ Add New ]"' +
  //   ' onblur="_is_user_adding_attribute_name=false; this.value = \'\';"' +
  //   ' onfocus="_is_user_adding_attribute_name=true; this.value = \'\';" />';



  var sel_rows = [];
  // for ( var i=0; i < sel_reg_list.length; ++i ) {
    var row_i = sel_reg_list[0];

    // if multiple regions are selected, show the selected regions first
    var di;
    if ( type === 'region_attributes' ) {
      if ( sel_reg_list.length ) {
        row_i = region_traversal_order[row_i];
      }
      di = {}
      di[data[row_i].shape_attributes.type] = "";
    } else {
      di = data[row_i];
    }

    var selected_num;
    if (sel_reg_list.length == 0){
      selected_num = row_i;
    }
    else {
      selected_num = sel_reg_list[0];
    }
    for (var col_header in _region_attributes ) {
        if(col_header == data[selected_num].shape_attributes.type){
          for (var col in _region_attributes [col_header]){
            // col_headers.push(_region_attributes [col_header][col])
            var mark = "";
            if( _region_attributes [col_header][col].att_type)
                mark = "<sup style='color: red; font-size:18px'>&#42;<sup>";
                  firstrow.insertCell(-1).innerHTML = '<b>' + _region_attributes [col_header][col].att_name + mark  + '</b>';
          }
        }
    }

    var row = attrtable.insertRow(-1);
    var region_id_cell              = row.insertCell(0);
    region_id_cell.innerHTML        = '' + row_names[row_i] + '';
    region_id_cell.style.fontWeight = 'bold';
    region_id_cell.style.width      = '2em';



    if (data[row_i].is_user_selected) {
      region_id_cell.style.backgroundColor = '#5599FF';
      row.style.backgroundColor = '#f2f2f2';
      sel_rows.push(row);
    }

    // console.log("__col __ headers ___");
    // console.log(col_headers);
    // console.log("-------");
    _selected_while_input = row_i;
    _img_metadata[_image_id].regions[row_i].is_user_selected = true;
    for ( var key in col_headers ) {
      var input_id = type[0] + '#' + key + '#' + _img_metadata[_image_id].regions[row_i].image_region_id;
          if ( di.hasOwnProperty(key) ){
          // var ip_val = di[key];
          for (var col in _region_attributes [key]){
            if(attributes_values.hasOwnProperty(input_id+'#'+col)){
                row.insertCell(-1).innerHTML = '<input type="text"' +
                ' id="' + input_id + '#'+ col + '"' +
                ' value="' + attributes_values[input_id+'#'+col] + '"' +
                ' onchange="update_attribute_value(\'' + input_id + '#' + col + '\', \'' + _region_attributes[key][col].att_name + '\', \'' + row_i + '\', this.value)" ' +
                ' onblur="attr_input_blur(' + row_i + ')"' +
                ' onfocus="attr_input_focus(' + row_i + ');" />';
            }
            else{
                  row.insertCell(-1).innerHTML = '<input type="text"' +
                  ' id="' + input_id + '#'+ col + '"' +
                  ' onchange="update_attribute_value(\'' + input_id + '#' + col + '\', \'' + _region_attributes[key][col].att_name + '\', \'' + row_i + '\', this.value)" ' +
                  ' onblur="attr_input_blur(' + row_i + ')"' +
                  ' onfocus="attr_input_focus(' + row_i + ');" />';
            }
          }

        }
      else{
      if ( key == data[sel_reg_list[0]].shape_attributes.type ) {
        for (var col in _region_attributes [key]){
          row.insertCell(-1).innerHTML = '<input type="text"' +
          ' id="' + input_id + '#'+ col + '"' +
          ' onchange="update_attribute_value(\'' + input_id + '#' + col + '\', \'' + _region_attributes[key][col].att_name + '\', \'' + row_i + '\', this.value)" ' +          ' onblur="attr_input_blur(' + row_i + ')"' +
          ' onfocus="attr_input_focus(' + row_i + ');" />';
        }
      }
    }
    }
    _img_metadata[_image_id].regions[row_i].is_user_selected = true;
  // }

  attributes_panel.replaceChild(attrtable, document.getElementById('attributes_panel_table'));
  attributes_panel.focus();

  // move vertical scrollbar automatically to show the selected region (if any)
  if ( sel_rows.length === 1 ) {
    var panelHeight = attributes_panel.offsetHeight;
    var sel_row_bottom = sel_rows[0].offsetTop + sel_rows[0].clientHeight;
    if (sel_row_bottom > panelHeight) {
      attributes_panel.scrollTop = sel_rows[0].offsetTop;
    } else {
      attributes_panel.scrollTop = 0;
    }
  } else {
    attributes_panel.scrollTop = 0;
  }
}
}


// function init_spreadsheet_input(type, col_headers, data, row_names) {

//   if ( typeof row_names === 'undefined' ) {
//     var row_names = [];
//     for ( var i = 0; i < data.length; ++i ) {
//       row_names[i] = i+1;
//     }
//   }

//   console.log("type: " + type);
//   console.log("col_headers: " + col_headers);
//   console.log(data);
//   console.log("row_names: " + row_names);
//   console.log(_region_attributes );
//   var attrname = '';
//   switch(type) {
//   case 'region_attributes':
//     attrname = 'Region Attributes';
//     break;

//   case 'file_attributes':
//     attrname = 'File Attributes';
//     break;
//   }

//   var attrtable = document.createElement('table');
//   attrtable.setAttribute('id', 'attributes_panel_table');
//   var firstrow = attrtable.insertRow(0);

//   // top-left cell
//   var topleft_cell = firstrow.insertCell(0);
//   topleft_cell.innerHTML = '';
//   topleft_cell.style.border = 'none';

//   for (var col_header in col_headers) {
//     firstrow.insertCell(-1).innerHTML = '<b>' + col_header + '</b>';
//   }
//   // allow adding new attributes
//   console.log(type[0]);
//   firstrow.insertCell(-1).innerHTML = '<input type="text"' +
//     ' onchange="add_new_attribute(\'' + type[0] + '\', this.value)"' +
//     ' value = "[ Add New ]"' +
//     ' onblur="_is_user_adding_attribute_name=false; this.value = \'\';"' +
//     ' onfocus="_is_user_adding_attribute_name=true; this.value = \'\';" />';

//   // if multiple regions are selected, show the selected regions first
//   var sel_reg_list       = [];
//   var remaining_reg_list = [];
//   var all_reg_list       = [];
//   var region_traversal_order = [];
//   if (type === 'region_attributes') {
//     // count number of selected regions
//     for ( var i = 0; i < data.length; ++i ) {
//       all_reg_list.push(i);
//       if ( data[i].is_user_selected ) {
//         sel_reg_list.push(i);
//       } else {
//         remaining_reg_list.push(i);
//       }
//     }
//     if ( sel_reg_list.length > 1 ) {
//       region_traversal_order = sel_reg_list.concat(remaining_reg_list);
//     } else {
//       region_traversal_order = all_reg_list;
//     }
//   }

//   var sel_rows = [];
//   for ( var i=0; i < data.length; ++i ) {
//     var row_i = i;

//     // if multiple regions are selected, show the selected regions first
//     var di;
//     if ( type === 'region_attributes' ) {
//       if ( sel_reg_list.length ) {
//         row_i = region_traversal_order[row_i];
//       }
//       di = data[row_i].region_attributes;
//     } else {
//       di = data[row_i];
//     }

//     var row = attrtable.insertRow(-1);
//     var region_id_cell              = row.insertCell(0);
//     region_id_cell.innerHTML        = '' + row_names[row_i] + '';
//     region_id_cell.style.fontWeight = 'bold';
//     region_id_cell.style.width      = '2em';

//     if (data[row_i].is_user_selected) {
//       region_id_cell.style.backgroundColor = '#5599FF';
//       row.style.backgroundColor = '#f2f2f2';
//       sel_rows.push(row);
//     }

//     for ( var key in col_headers ) {
//       var input_id = type[0] + '#' + key + '#' + row_i;

//       if ( di.hasOwnProperty(key) ) {
//         var ip_val = di[key];
//         // escape all single and double quotes
//         ip_val = ip_val.replace(/'/g, '\'');
//         ip_val = ip_val.replace(/"/g, '&quot;');

//         if ( ip_val.length > 30 ) {
//           row.insertCell(-1).innerHTML = '<textarea ' +
//             ' rows="' + (Math.floor(ip_val.length/30)-1) + '"' +
//             ' cols="30"' +
//             ' id="' +   input_id + '"' +
//             ' autocomplete="on"' +
//             ' onchange="update_attribute_value(\'' + input_id + '\', this.value)"' +
//             ' onblur="attr_input_blur(' + row_i + ')"' +
//             ' onfocus="attr_input_focus(' + row_i + ');"' +
//             ' >' + ip_val + '</textarea>';
//         } else {
//           row.insertCell(-1).innerHTML = '<input type="text"' +
//             ' id="' +   input_id + '"' +
//             ' value="' + ip_val + '"' +
//             ' autocomplete="on"' +
//             ' onchange="update_attribute_value(\'' + input_id + '\', this.value)"' +
//             ' onblur="attr_input_blur(' + row_i + ')"' +
//             ' onfocus="attr_input_focus(' + row_i + ');" />';
//         }
//       } else {
//         row.insertCell(-1).innerHTML = '<input type="text"' +
//           ' id="' + input_id + '"' +
//           ' onchange="update_attribute_value(\'' + input_id + '\', this.value)" ' +
//           ' onblur="attr_input_blur(' + row_i + ')"' +
//           ' onfocus="attr_input_focus(' + row_i + ');" />';
//       }
//     }
//   }

//   attributes_panel.replaceChild(attrtable, document.getElementById('attributes_panel_table'));
//   attributes_panel.focus();

//   // move vertical scrollbar automatically to show the selected region (if any)
//   if ( sel_rows.length === 1 ) {
//     var panelHeight = attributes_panel.offsetHeight;
//     var sel_row_bottom = sel_rows[0].offsetTop + sel_rows[0].clientHeight;
//     if (sel_row_bottom > panelHeight) {
//       attributes_panel.scrollTop = sel_rows[0].offsetTop;
//     } else {
//       attributes_panel.scrollTop = 0;
//     }
//   } else {
//     attributes_panel.scrollTop = 0;
//   }
// }

function update_attributes_panel(type) {
  if (_current_image_loaded &&
      _is_attributes_panel_visible) {
    if (_is_reg_attr_panel_visible) {
      update_region_attributes_input_panel();
    }

    if ( _is_file_attr_panel_visible ) {
      update_file_attributes_input_panel();
    }
    update_vertical_space();
  }
}

function update_region_attributes_input_panel(attr_id) {
  init_spreadsheet_input('region_attributes',
                         _region_attributes,
                         _img_metadata[_image_id].regions,
                         attr_id);

}

function update_file_attributes_input_panel() {
  init_spreadsheet_input('file_attributes',
                         _file_attributes,
                         [_img_metadata[_image_id].file_attributes],
                         [_current_image_filename]);
}


function toggle_attributes_input_panel() {
  if( _is_reg_attr_panel_visible ) { // && required_attributes_filled()
    toggle_reg_attr_panel();
  }
  if( _is_file_attr_panel_visible ) {
    toggle_file_attr_panel();
  }
}

function toggle_reg_attr_panel() {

  if(!_is_reg_attr_panel_visible){
    for ( var shape_name in _REGION_SHAPE ) {
        var ui_element = document.getElementById('region_shape_' + _REGION_SHAPE[shape_name]);
        ui_element.classList.remove('selected');
    }
     _current_shape = "";
  }

  if ( _current_image_loaded ) {
    // var panel = document.getElementById('reg_attr_panel_button');
    // panel.classList.toggle('active');
    if ( _is_attributes_panel_visible ) {
      if( _is_reg_attr_panel_visible ) {
        attributes_panel.style.display   = 'none';
        _is_attributes_panel_visible = false;
        _is_reg_attr_panel_visible   = false;
        _reg_canvas.focus();
        // add horizontal spacer to allow scrollbar
        // var hs = document.getElementById('horizontal_space');
        // hs.style.height = attributes_panel.offsetHeight+'px';

      } else {
        update_region_attributes_input_panel();
        _is_reg_attr_panel_visible  = true;
        _is_file_attr_panel_visible = false;
        // de-activate the file-attr accordion panel
        // var panel = document.getElementById('file_attr_panel_button');
        // panel.classList.toggle('active');
        attributes_panel.focus();
      }
    } else {

      update_region_attributes_input_panel();
       _is_attributes_panel_visible = true;
      _is_reg_attr_panel_visible = true;
      attributes_panel.style.display = 'block';
      attributes_panel.focus();
    }
    update_vertical_space();
  } else {
    show_message('Please load some images first');
  }
}

function toggle_file_attr_panel() {
  if ( _current_image_loaded ) {
    var panel = document.getElementById('file_attr_panel_button');
    panel.classList.toggle('active');
    if ( _is_attributes_panel_visible ) {
      if( _is_file_attr_panel_visible ) {
        attributes_panel.style.display = 'none';
        _is_attributes_panel_visible = false;
        _is_file_attr_panel_visible = false;
      } else {
        update_file_attributes_input_panel();
        _is_file_attr_panel_visible = true;
        _is_reg_attr_panel_visible = false;

        // de-activate the reg-attr accordion panel
        var panel = document.getElementById('reg_attr_panel_button');
        panel.classList.toggle('active');
      }
    } else {
      _is_attributes_panel_visible = true;
      update_file_attributes_input_panel();
      _is_file_attr_panel_visible = true;
      attributes_panel.style.display = 'block';
    }
    update_vertical_space();
  } else {
    show_message('Please load some images first');
  }
}

function update_vertical_space() {
  var panel = document.getElementById('vertical_space');
  panel.style.height = attributes_panel.offsetHeight+'px';
}

function update_attribute_value(attr_id, att_name, regionId, value) {
  var attr_id_split = attr_id.split('#');
  var type = attr_id_split[0];
  var attribute_name = att_name;
  var region_id = regionId;

  switch(type) {
  case 'r': // region attribute
    if( value !== ""){
      _img_metadata[_image_id].regions[region_id].region_attributes[attribute_name] = value;
      attributes_values[attr_id] = value;
      update_region_attributes_input_panel(attr_id);
    }
    else {
      delete _img_metadata[_image_id].regions[region_id].region_attributes[attribute_name];
      attributes_values[attr_id] = value;
      update_region_attributes_input_panel();
    }

    break;

  case 'f': // file attribute
    _img_metadata[_image_id].file_attributes[attribute_name] = value;
    update_file_attributes_input_panel();
    break;
  }
  if (_is_reg_attr_panel_visible) {
    set_region_select_state(region_id, false);
  }
  _redraw_reg_canvas();
  _is_user_updating_attribute_value = false;
  save_current_data_to_browser_cache();
}

function add_new_attribute(type, attribute_name) {
  switch(type) {
  case 'r': // region attribute
    if ( !_region_attributes.hasOwnProperty(attribute_name) ) {
      _region_attributes[attribute_name] = true;
    }
    update_region_attributes_input_panel();
    break;

  case 'f': // file attribute
    if ( !_file_attributes.hasOwnProperty(attribute_name) ) {
      _file_attributes[attribute_name] = true;
    }
    update_file_attributes_input_panel();
    break;
  }
  _is_user_adding_attribute_name = false;
}

function display_add_region_popup() {
  // Get the modal
  var modal = document.getElementById('myModal');

  // // Get the button that opens the modal
  // var btn = document.getElementById("myBtn");

  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("close")[0];

  // When the user clicks on the button, open the modal
  // btn.onclick = function() {
    modal.style.display = "block";
  // }

  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    modal.style.display = "none";
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }
}

function validateFormOnSubmit(data){
  var region_name = document.getElementById(data["region_name_id"]);
  var region_color = document.getElementById(data["region_color_id"]);
  var region_description = document.getElementById(data["region_desc_id"]);
  if(region_name.value != "" ) {
    console.log("submitted")
    legendList[region_name.value] = region_color.value;
    legendListDesc[region_name.value] = region_description.value;
    populate_region_list(legendList, label_id);
    var modal = document.getElementById('myModal');
    modal.style.display = "none";
  }

  region_name.value = "";
  region_color.value = "";
  region_description.value = "";
}

function getLanguage() {
  return document.getElementById("hiddenPageLanguage").value;
}

function getVersion() {
  return document.getElementById("hiddenPageVersion").value;
}

function getLayoutVersion() {
  return document.getElementById("hiddenPageLayoutVersion").value;
}

function getModality() {
  return document.getElementById("hiddenPageModality").value;
}

function perform_ocr() {
  var image = _img_metadata[_image_id];
  image.regions.forEach(function (region, region_id) { 
    if (region.ocr_done || region.is_ocr_loading) return;
    region.is_ocr_loading = true;
    $.ajax({
      type:"POST",
      url: "/fastocr/ocr/temp/",
      async: true,
      cache: false,
      timeout: 30000,
      data: {
        "image": _img_metadata[_image_id].fileref,
        "version": region.ocr_version,
        "layout_version": region.layout_version,
        "modality": region.modality,
        "language": region.language,
        "region": JSON.stringify(region.shape_attributes)
      },
      success: function (response){
        console.log(response);
        if (response.ok) {
          console.log("OCR Response", response.ocr);
          region.ocr = response.ocr;
        }
        else {
          region.ocr = 'Some Error occured while performing OCR';
        }
        region.is_ocr_loading = false;
        region.ocr_done = true;
        redraw_ocr();
        console.log(_img_metadata[_image_id]);
      },
      error: function(err){
        console.log(err);
        console.log("OOPS!","Looks like there was an error: " + err, "error");
        region.ocr = 'Some Error occured while performing OCR';
        region.ocr_done = true;
        region.is_ocr_loading = false;
        redraw_ocr();
      }
    });
    console.log("performing OCR for region:", region);
  });
  redraw_ocr();
  console.log(_img_metadata[_image_id]);
}

function _get_ocr_content(region) {
  if (region.is_ocr_loading) {
    return [
      elem("i", {"class": "fa fa-spin fa-spinner fa-2x"})
    ];
  }
  if (region.ocr_done) return region.ocr;
  return 'ERROR';
}

function performRegionOCR(regionIndex) {
  console.log("Performing OCR for region ", regionIndex);
  var region = _img_metadata[_image_id].regions[regionIndex]

  if (region.is_ocr_loading) {
    alert("OCR for this region is being processed, Please wait.")
  }
  else {
    region.ocr_done = false;
    region.is_ocr_loading = false;
    perform_ocr();
  }
}


function copyRegionContent(containerid) {
  if (document.selection) {
    var range = document.body.createTextRange();
    range.moveToElementText(document.getElementById(containerid));
    range.select().createTextRange();
    document.execCommand("copy");
  } else if (window.getSelection) {
    var range = document.createRange();
    range.selectNode(document.getElementById(containerid));
    window.getSelection().addRange(range);
    document.execCommand("copy");
    alert("Text has been copied, now paste in the text-area")
  }
}

function changeRegionModality(regionIndex, option) {
  console.log("Changing the modality of region ", regionIndex, " to ", option);
  var region = _img_metadata[_image_id].regions[regionIndex];
  region.modality = option;
}

function changeRegionLanguage(regionIndex, option) {
  console.log("Changing the language of region ", regionIndex, " to ", option);
  var region = _img_metadata[_image_id].regions[regionIndex];
  region.language = option;
}

function changeRegionOCRVersion(regionIndex, option) {
  console.log("Changing the OCR Version of region ", regionIndex, " to ", option);
  var region = _img_metadata[_image_id].regions[regionIndex];
  region.ocr_version = option;
}

function changeRegionLayoutVersion(regionIndex, option) {
  console.log("Changing the Layout Version of region ", regionIndex, " to ", option);
  var region = _img_metadata[_image_id].regions[regionIndex];
  region.layout_version = option;
}

function changePageModality(option) {
  console.log(option);
  var ele = document.getElementById("hiddenPageModality");
  ele.value = option;
  _img_metadata[_image_id].regions.forEach((region, idx) => {
    region.ocr_done = false;
    region.is_ocr_loading = false;
    region.modality = option;
  });
  console.log(_img_metadata[_image_id]);
}

function changePageLanguage(option) {
  console.log(option);
  var ele = document.getElementById("hiddenPageLanguage");
  ele.value = option;
  _img_metadata[_image_id].regions.forEach((region, idx) => {
    region.ocr_done = false;
    region.is_ocr_loading = false;
    region.language = option;
  });
  console.log(_img_metadata[_image_id]);
}

function changePageVersion(option) {
  console.log(option);
  var ele = document.getElementById('hiddenPageVersion');
  ele.value = option;
  _img_metadata[_image_id].regions.forEach((region, idx) => {
    region.ocr_done = false;
    region.is_ocr_loading = false;
    region.ocr_version = option;
  });
  console.log(_img_metadata[_image_id]);
}

function changePageLayoutVersion(option) {
  console.log(option);
  var ele = document.getElementById('hiddenPageLayoutVersion');
  ele.value = option;
  _img_metadata[_image_id].regions.forEach((region, idx) => {
    region.ocr_done = false;
    region.is_ocr_loading = false;
    region.layout_version = option;
  });
  console.log(_img_metadata[_image_id]);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function _draw_single_region(region, index) {
  var idx = index + 1;
  var card = elem("div", {"class": "card m-2 region-card", "id": index}, [
    // card header
    elem("div", {"class": "card-header"}, [
      elem("div", {"class": "row"}, [
        elem("div", {"class": "col-2"}, "Region " + idx.toString()),
        elem("div", { "class": "col-8 text-center"}, [
          elem("span", {"class": "badge rounded-pill bg-info"}, capitalizeFirstLetter(region.modality)),
          elem("span", {"class": "badge rounded-pill bg-info"}, capitalizeFirstLetter(region.language)),
          elem("span", {"class": "badge rounded-pill bg-info"}, capitalizeFirstLetter(region.layout_version)),
          elem("span", {"class": "badge rounded-pill bg-info"}, capitalizeFirstLetter(region.ocr_version)),
          elem("span", {"class": "badge rounded-pill bg-info"}, "# Words: " + region.ocr.trim().split(/\s+/).length),
        ]),
        elem("div", { "class": "col-2", "style": "text-align: right;"}, [
          elem("div", {"class": "btn-group btn-group-sm", "role": "group", "aria-label": "Action button group"}, [
            elem("button", {
              "type": "button",
              "class": "btn btn-outline-primary",
              "onclick": "performRegionOCR(" + index.toString() + ");"
            }, [elem("i", {"class": "fa fa-refresh"})]),
            elem("button", {
              "type": "button",
              "class": "btn btn-outline-primary",
              "onclick": "copyRegionContent('text-" + index.toString() + "');"
            }, [elem("i", {"class": "fa fa-copy"})])
          ])
        ])
      ])
    ]),
    // card body
    elem("div", {"class": "card-body", "id": "text-" + index.toString(), "style": "white-space: pre-line;"}, _get_ocr_content(region)),
    // card footer
    elem("div", {"class": "card-footer"}, [
      elem("div", {"class": "row"}, [
        elem("div", {"class": "col-3 pl-0"}, [
          elem("select", {
            "class": "form-select form-select-sm",
            "onchange": "changeRegionModality(" + index.toString() + ", this.options[this.selectedIndex].value);",
          }, [
            elem("option", {"selected": "true"}, "Modality (" + region.modality + ")"),
            elem("option", {"value": "printed"}, "Printed"),
            elem("option", {"value": "handwritten"}, "Handwritten"),
            elem("option", {"value": "scenetext"}, "SceneText"),
          ])
        ]),
        elem("div", {"class": "col-3 pl-0"}, [
          elem("select", {
            "class": "form-select form-select-sm",
            "onchange": "changeRegionLanguage(" + index.toString() + ", this.options[this.selectedIndex].value);",
          }, [
            elem("option", {"selected": "true"}, "Language (" + region.language + ")"),
            elem("option", {"value": "assamese"}, "Assamese"),
            elem("option", {"value": "bengali"}, "Bengali"),
            elem("option", {"value": "english"}, "English"),
            elem("option", {"value": "gujarati"}, "Gujarati"),
            elem("option", {"value": "hindi"}, "Hindi"),
            elem("option", {"value": "kannada"}, "Kannada"),
            elem("option", {"value": "malayalam"}, "Malayalam"),
            elem("option", {"value": "manipuri"}, "Manipuri"),
            elem("option", {"value": "marathi"}, "Marathi"),
            elem("option", {"value": "oriya"}, "Oriya"),
            elem("option", {"value": "punjabi"}, "Punjabi"),
            elem("option", {"value": "tamil"}, "Tamil"),
            elem("option", {"value": "telugu"}, "Telugu"),
            elem("option", {"value": "urdu"}, "Urdu"),
          ])
        ]),
        elem("div", {"class": "col-3 pl-0"}, [
          elem("select", {
            "class": "form-select form-select-sm",
            "onchange": "changeRegionLayoutVersion(" + index.toString() + ", this.options[this.selectedIndex].value);",
          }, [
            elem("option", {"selected": "true"}, "Layout (" + region.layout_version + ")"),
            elem("option", {"value": "doctr"}, "V1.0"),
            elem("option", {"value": "v2_doctr"}, "V1.1"),
            elem("option", {"value": "craft"}, "V2.0"),
          ])
        ]),
        elem("div", {"class": "col-3 pl-0"}, [
          elem("select", {
            "class": "form-select form-select-sm",
            "onchange": "changeRegionOCRVersion(" + index.toString() + ", this.options[this.selectedIndex].value);",
          }, [
            elem("option", {"selected": "true"}, "OCR (" + region.ocr_version + ")"),
            elem("option", {"value": "v2"}, "V2"),
            elem("option", {"value": "v3"}, "V3.0"),
            elem("option", {"value": "v4"}, "V4.0"),
            elem("option", {"value": "v4_robust"}, "V4.1"),
            elem("option", {"value": "v4_bilingual"}, "V4.2"),
            elem("option", {"value": "v4_robustbilingual"}, "V4.3"),
            elem("option", {"value": "v4.14u"}, "V4.0.14+u"),
            elem("option", {"value": "v4.14u_robust"}, "V4.1.14+u"),
            elem("option", {"value": "tesseract"}, "Tesseract-V4"),
          ])
        ]),
      ])
    ])
  ]);
  return card
}

function redraw_ocr() {
  var ocr_div = document.getElementById('ocr');
  ocr_div.innerHTML = '';
  _img_metadata[_image_id].regions.forEach(function(region, idx) {
    ocr_div.appendChild(_draw_single_region(region, idx));
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key == "Delete") {
    del_sel_regions();
  }
});