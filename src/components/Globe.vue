<template>
  <div class="map">
    <div id="toolbar">
			<table class="infoPanel">
				<tbody>
					<tr>
						<td>左键单击以添加顶点.</td>
					</tr>
					<tr>
						<td>右键单击以完成绘制.</td>
					</tr>
				</tbody>
			</table>
			<button type="button" class="cesium-button" @click="whetherLoadTerrain">
				<label style="pointer-events: none;"><input type="checkbox" style="pointer-events: none;" v-model="loadTerrain">加载地形</label>
			</button>
			<br />
			<select class="cesium-button" v-model="drawingMode">
				<option value="">请选择...</option>
				<option v-for='item in drawItem' :value="item.value">{{ item.name }}</option>
			</select>
		</div>
		<div class="author">
			<p>作者: {{ author }}</p>
			<p>说明: {{ description }}</p>
		</div>
		<div id="globe"></div>
  </div>
</template>

<script>
export default {
  name: 'Globe',
  data () {
    return {
			author: 'BretGui',
			description: 'Cesium实现标绘示例',
			loadTerrain: false,
			drawItem: [
				{name: "折线", value: "line"},
				{name: "多边形", value: "polygon"}
			],
			drawingMode: ''
    }
  },
	methods: {
		whetherLoadTerrain(){
			this.loadTerrain = !this.loadTerrain;
			if(this.loadTerrain){
				this.viewer.terrainProvider = Cesium.createWorldTerrain();
			}else{
				this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
			}
		},
		createPoint(worldPosition) {
			var point = this.viewer.entities.add({
					position : worldPosition,
					point : {
							color : Cesium.Color.WHITE,
							pixelSize : 5,
							heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
					}
			});
			return point;
		},
		drawShape(positionData) {
			var shape;
			if (this.drawingMode === 'line') {
					shape = this.viewer.entities.add({
							polyline : {
									positions : positionData,
									clampToGround : true,
									width : 3
							}
					});
			}
			else if (this.drawingMode === 'polygon') {
					shape = this.viewer.entities.add({
							polygon: {
									hierarchy: positionData,
									material: new Cesium.ColorMaterialProperty(Cesium.Color.WHITE.withAlpha(0.7))
							}
					});
			}
			return shape;
		},
		terminateShape() {
			activeShapePoints.pop();
			this.drawShape(activeShapePoints);
			this.viewer.entities.remove(floatingPoint);
			this.viewer.entities.remove(activeShape);
			floatingPoint = undefined;
			activeShape = undefined;
			activeShapePoints = [];
		},
		pickPosition(windowPosition) {
			var viewer = this.viewer;
			var scene = this.viewer.scene;
			var cartesian = scene.camera.pickEllipsoid(windowPosition,scene.globe.ellipsoid);
			if(this.loadTerrain){
			    var ray = viewer.camera.getPickRay(windowPosition);
			    cartesian = viewer.scene.globe.pick(ray,viewer.scene);
			}
			return cartesian;
		}
	},
	mounted() {
		var _self = this;
		//指定默认camera可视范围到中国上空
		Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(71.39628233299722, 17.90751494736041, 137.14821935043528, 49.06704603525708);
		this.viewer = new Cesium.Viewer("globe",{
			//Google影像服务
			imageryProvider: new Cesium.UrlTemplateImageryProvider({
				url : 'http://mt0.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}',
				maximumLevel : 20
			}),
			terrainProvider: this.loadTerrain ? Cesium.createWorldTerrain() : new Cesium.EllipsoidTerrainProvider(),
			animation:false,                                        //创建动画小部件
			baseLayerPicker:false,                                 //创建选择卫星影像部件
			fullscreenButton:false,                                 //创建全屏模式按钮
			vrButton:false,                                         //启动VR模式按钮
			geocoder:false,                                         //创建地域搜索部件
			homeButton:false,                                       //创建home按钮
			infoBox:false,                                          //创建信息窗口
			sceneModePicker:false,                                  //创建场景切换部件
			selectionIndicator:false,                               //创建选中指示器部件
			scene3DOnly:false,                                      //实例仅会在3D渲染
			timeline:false,                                         //创建时间轴
			navigationHelpButton:false,                             //创建导航帮助按钮
		});
		//天地图中文注记服务
		this.viewer.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
			url: "http://t0.tianditu.com/cia_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default.jpg&tk=f52d8930396083f20b3702985944e55f",
			layer: "tdtAnnoLayer",
			style: "default",
			format: "image/jpeg",
			tileMatrixSetID: "GoogleMapsCompatible"
		}));
		
		var viewer = this.viewer;
		viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
		
		var activeShapePoints = [];
		var activeShape;
		var floatingPoint;
		var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
		handler.setInputAction(function(event) {
			if (!Cesium.Entity.supportsPolylinesOnTerrain(viewer.scene)) {
					console.log('This browser does not support polylines on terrain.');
					return;
			}
			// We use `viewer.scene.pickPosition` here instead of `viewer.camera.pickEllipsoid` so that
			// we get the correct point when mousing over terrain.
			//var earthPosition = viewer.scene.pickPosition(event.position);
			var earthPosition = _self.pickPosition(event.position);
			// `earthPosition` will be undefined if our mouse is not over the globe.
			if (Cesium.defined(earthPosition)) {
					if (activeShapePoints.length === 0) {
							floatingPoint = _self.createPoint(earthPosition);
							activeShapePoints.push(earthPosition);
							var dynamicPositions = new Cesium.CallbackProperty(function () {
									return activeShapePoints;
							}, false);
							activeShape = _self.drawShape(dynamicPositions);
					}
					activeShapePoints.push(earthPosition);
					_self.createPoint(earthPosition);
			}
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
		
		handler.setInputAction(function(event) {
			if (Cesium.defined(floatingPoint)) {
					//var newPosition = viewer.scene.pickPosition(event.endPosition);
					var newPosition = _self.pickPosition(event.endPosition);
					if (Cesium.defined(newPosition)) {
							floatingPoint.position.setValue(newPosition);
							activeShapePoints.pop();
							activeShapePoints.push(newPosition);
					}
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		
		handler.setInputAction(function(event) {
			activeShapePoints.pop();
			_self.drawShape(activeShapePoints);
			_self.viewer.entities.remove(floatingPoint);
			_self.viewer.entities.remove(activeShape);
			floatingPoint = undefined;
			activeShape = undefined;
			activeShapePoints = [];
		}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.map, #globe {
	height: 100%;
	width: 100%;
}
#toolbar {
	margin: 5px;
	padding: 2px 5px;
	position: absolute;
	z-index: 9999;
}
.infoPanel {
	background: rgba(42, 42, 42, 0.8);
	padding: 4px;
	border: 1px solid #444;
	border-radius: 4px;
}
.author {
	position: absolute;
	left: 20px;
	bottom: 40px;
	background: rgba(42, 42, 42, 0.8);
	padding: 0 20px;
	border: 1px solid #444;
	border-radius: 4px;
	z-index: 9999;
}
</style>
