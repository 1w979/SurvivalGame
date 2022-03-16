// 全局变量
var gl; // WebGL上下文
var program; // shader program

var mvStack = []; // 模视投影矩阵栈，用数组实现，初始为空
var matCamera = mat4(); // 照相机变换，初始为恒等矩阵
var matReverse = mat4(); // 照相机变换的逆变换，初始为恒等矩阵
var matObj=mat4();//兔子位置矩阵

//阳光照射率
var sunRate = 1.0;
var yRot = 0.0; // 用于动画的旋转角
var sunAngle = 0.0;//太阳的旋转角
var deltaAngle = 60.0; // 每秒旋转角度
var deltaAngleSun = 5.0; // 太阳每秒旋转角度
var yTrans = 0.0;//雪花下落距离

//天气情况
var weatherState = 0;//默认0为晴天，1为雪天，2为大雾
var LockSunLight = true;    //控制太阳点光源是否按白天黑夜开关
var snowOpen = false;   //是否开启雪花效果
var numSnow = 3000; // 场景中雪花的数目
var posSnow = [];  //雪花位置
var starTexObj;//夜晚天空
var days=1;//游戏天数
var isNight = false;//是否是黑夜

var waterPoint = 100;//含水量
var foodPoint = 100; //食物量
var life = 100;	//生命值
var collisionFlower = 8; //初始牵牛花数量
var collisionSunflower = 4;   //初始太阳花数量
var numFlower = 24; // 场景中牵牛花最多的数目
var posFlower = [];  //牵牛花位置
var numSunflower = 12; // 场景中太阳花最多的数目
var posSunflower = [];  //太阳花位置

var groundTexObj = [];//放置地面纹理图的数组

var rotateAngle = 0;	//兔子的旋转角度//相机在X轴、Z轴的旋转角度
var cameraAngle = [0, 0]; //相机在X轴、Z轴的旋转角度
var distance = 0; //镜头与兔子的距离
var deltaD = 2.0; //镜头每次移动的距离

// 用于保存W、S、A、D、Q、E四个方向键的按键状态的数组
var keyDown = [false, false, false, false];
var sizeGround = 20.0; // 正方形地面的边长的一半
var numVerticesGround; // 地面顶点个数
var bufferGround; // 存放地面顶点数据的buffer对象

var g = 9.8; // 重力加速度
var initSpeed = 4; // 初始速度 
var jumping = false; // 是否处于跳跃过程中
var jumpY = 0; // 当前跳跃的高度
var jumpTime = 0; // 从跳跃开始经历的时间

//记录游戏状态的数组，以此控制游戏进程
var Step = [true, false];	
var count = 0;	//计算到达第几步


//开始读取obj模型（异步方式），返回OBJModel对象
var objRabbit = loadOBJ("Res\\rabbit\\file.obj");
var objTree1 = loadOBJ("Res\\tree\\Lowpoly_tree_sample.obj");
var objTree2 = loadOBJ("Res\\tree2\\file.obj");
var objFlower = loadOBJ("Res\\flower\\flower.obj");
var objSunflower = loadOBJ("Res\\sunflower\\file.obj");

//光源对象
//构造函数，各属性有默认值
var Light = function(){
    //光源位置/方向（默认为斜上方方向光源
    this.pos=vec4(1.0,1.0,1.0,0.0);
    this.ambient = vec3(0.2,0.2,0.2);//环境光
    this.diffuse = vec3(1.0,1.0,1.0);//漫反射光
    this.specular = vec3(1.0,1.0,1.0);//镜面反射光
    this.on = true;//是否打开了光源
}

var lights = [];//光源数组
var lightSun = new Light();//太阳光源（使用默认光源属性
var lightWhite = new Light();//白色手电筒光源

//光源属性初始化
function initLights(){
    lights.push(lightSun);

    //设置白色手电筒光源属性
    lightWhite.pos=vec4(0.0,0.0,0.0,1.0);//光源位置（建模坐标系
    lightWhite.ambient = vec3(0.0,0.0,0.0);//环境光
    lightWhite.diffuse = vec3(1.0,1.0,1.0);//漫反射光
    lightWhite.specular = vec3(1.0,1.0,1.0);//镜面反射光
    lights.push(lightWhite);

    /*为progrObj中光源属性传值*/
    gl.useProgram(programObj);
    var ambientLight = [];
    ambientLight.push(lightSun.ambient);
    ambientLight.push(lightWhite.ambient);
    gl.uniform3fv(programObj.u_AmbientLight,flatten(ambientLight));
    var diffuseLight = [];
    diffuseLight.push(lightSun.diffuse);
    diffuseLight.push(lightWhite.diffuse);
    gl.uniform3fv(programObj.u_DiffuseLight,flatten(diffuseLight));
    var specularLight = [];
    specularLight.push(lightSun.specular);
    specularLight.push(lightWhite.specular);
    gl.uniform3fv(programObj.u_SpecularLight,flatten(specularLight));

    //给聚光灯参数传值
    gl.uniform3fv(programObj.u_SpotDirection,flatten(vec3(0.0,0.0,-1.0)));//往负z轴照
    gl.uniform1f(programObj.u_SpotCutOff,8);//设截止角
    gl.uniform1f(programObj.u_SpotExponent,3);//设衰减指数

    //给聚光灯参数传值
    gl.useProgram(program);
    gl.uniform3fv(program.u_SpotDirection,flatten(vec3(0.0,0.0,-1.0)));//往负z轴找
    gl.uniform1f(program.u_SpotCutOff,8);//设截止角
    gl.uniform1f(program.u_SpotExponent,3);//设置衰减指数

    passLightsOn();//光源开关传值    	

}
//光源开关传值
function passLightsOn(){
    var lightsOn = [];
    for(var i=0;i<lights.length;i++){
        if(lights[i].on)
        lightsOn[i]=1;
        else
        lightsOn[i]=0;
    }
    gl.useProgram(program);
    gl.uniform1iv(program.u_LightOn,lightsOn);

    gl.useProgram(programObj);
    gl.uniform1iv(programObj.u_LightOn,lightsOn);
}

var fogOn=false;//雾化状态，初始为关闭雾化
function passFogOn(){//传雾化的开启或关闭状态的值
	var fog;
	if(fogOn)
		fog=1;
	else
		fog=0;
	gl.useProgram(program);
	gl.uniform1i(program.u_bFogOn,fog);
	
	gl.useProgram(programObj);
	gl.uniform1i(programObj.u_bFogOn,fog);
}


//材质对象
//构造函数，各属性有默认值
var MaterialObj = function(){
    this.ambient = vec3(0.0,0.0,0.0);//环境反射系数
    this.diffuse = vec3(0.8,0.8,0.8);//漫反射系数
    this.specular = vec3(0.0,0.0,0.0);//镜面反射系数
    this.emission = vec3(0.0,0.0,0.0);//发射光
    this.shininess = 10;//高光系数
    this.alpha = 1.0; //透明度，默认完全不透明
}
//天空材质
var mtlSky = new MaterialObj();
mtlSky.ambient = vec3(0.0, 0.0, 0.0);// 环境反射系数
mtlSky.diffuse = vec3(0.0, 0.0, 0.0);//漫反射系数
mtlSky.specular = vec3(0.0, 0.0, 0.0);// 镜面反射系数
mtlSky.emission = vec3(0.2, 0.2, 0.2);//发射光
mtlSky.shininess = 1000;// 高光系数

//东升西落的太阳
var mtlSunLight = new MaterialObj();
//设置太阳材质
mtlSunLight.ambient = vec3(0.1,0.1,0.1);//环境反射系数
mtlSunLight.diffuse = vec3(0.1,0.1,0.1);//漫反射系数
mtlSunLight.specular = vec3(0.2,0.2,0.2);//镜面反射系数
mtlSunLight.emission = vec3(1.0,1.0,1.0);//发射光
mtlSunLight.shininess = 500 ;//高光系数
mtlSunLight.alpha = 1.0;//透明度

//纹理对象（自定义对象，并非webgl的纹理对象
var TextureObj = function(pathName,format,mipmapping){
    this.path=pathName;//纹理图文件路径
    this.format=format;//数据格式
    this.mipmapping = mipmapping;//是否启用mipmapping
    this.texture = null;//webgl纹理对象
    this.complete = false;//是否已经完成文件加载
}
//创建纹理对象，加载纹理图
//参数为文件路径，纹理图格式（gl.RGB、gl.RGBA等
//以及是否启用mipmapping
//返回texture对象
function loadTexture(path,format,mipmapping){
    //新建一个texture对象
    var texObj = new TextureObj(path,format,mipmapping);

    var image = new Image();//创建一个image对象
    if(!image){
        console.log("创建image对象失败！");
        return false;
    }

    //注册图像文件加载完毕时间的响应函数
    image.onload = function(){
        console.log("纹理图"+path+"加载完毕");

        //初始化纹理对象
        initTexture(texObj,image);

        textureLoaded++;//增加已加载纹理数
        //已加载纹理数如果等于总纹理数
        //则可以开始绘制了
        if(textureLoaded == numTextures)
        requestAnimFrame(render);//请求重绘
    };
    //指定图像源，此时浏览器开始加载图像
    image.src = path;
    console.log("开始加载纹理图：" + path);

    return texObj;
}
//初始化纹理对象
function initTexture(texObj,image){
    texObj.texture = gl.createTexture();//创建纹理对象
    if(!texObj.texture){
        console.log("创建纹理对象失败！");
        return false;
    }
    //绑定纹理对象
    gl.bindTexture(gl.TEXTURE_2D,texObj.texture);

    //在加载纹理图像时对其沿y轴反转
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);

    //加载纹理图像
    gl.texImage2D(gl.TEXTURE_2D,0,texObj.format,texObj.format,gl.UNSIGNED_BYTE,image);

    if(texObj.mipmapping){//是否开始mipmapping？
        //自动生成各级分辨率的纹理图
        gl.generateMipmap(gl.TEXTURE_2D);
        //设置插值方式
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    }else
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);

    //纹理对象初始化完毕
    texObj.complete = true;//纹理对象初始化完毕
}

// 定义Obj对象
// 构造函数
var Obj = function() {
    this.numVertices = 0;           // 顶点个数
    this.vertices = new Array(0);   // 用于保存顶点数据的数组
    this.normals = new Array(0);    //用于保存法向数据的数组
    this.texcoords = new Array(0);  //用于保存纹理坐标数据的数组

    this.vertexBuffer = null;       // 存放顶点数据的buffer对象
    this.normalBuffer = null;       //存放法向数据的buffer对象
    this.texBuffer =  null;         //存放纹理坐标数据的buffer对象

    this.color = vec3(1.0, 1.0, 1.0); // 对象颜色，默认为白色
    this.material = new MaterialObj(); //材质
    this.texObj = null;             //texture对象
}

// 初始化缓冲区对象(VBO)
Obj.prototype.initBuffers = function() {
    /*创建并初始化顶点坐标缓冲区对象(Buffer Object)*/
    // 创建缓冲区对象，存于成员变量vertexBuffer中
    this.vertexBuffer = gl.createBuffer();
    // 将vertexBuffer绑定为当前Array Buffer对象
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    // 为Buffer对象在GPU端申请空间，并提供数据
    gl.bufferData(gl.ARRAY_BUFFER, // Buffer类型
        flatten(this.vertices), // 数据来源
        gl.STATIC_DRAW // 表明是一次提供数据，多遍绘制
    );
    // 顶点数据已传至GPU端，可释放内存
    this.vertices.length = 0;

    /*创建并初始化顶点坐标缓冲区对象(Buffer Object)*/
    if(this.normals.length!=0){
    // 创建缓冲区对象，存于成员变量normalBuffer中
    this.normalBuffer = gl.createBuffer();
    // 将normalBuffer绑定为当前Array Buffer对象
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    // 为Buffer对象在GPU端申请空间，并提供数据
    gl.bufferData(gl.ARRAY_BUFFER, // Buffer类型
        flatten(this.normals), // 数据来源
        gl.STATIC_DRAW // 表明是一次提供数据，多遍绘制
    );
    // 顶点数据已传至GPU端，可释放内存
    this.normals.length = 0;
    }

    /*创建并初始化顶点坐标缓冲区对象(Buffer Object)*/
    if(this.texcoords.length!=0){
        // 创建缓冲区对象，存于成员变量texBuffer中
        this.texBuffer = gl.createBuffer();
        // 将texBuffer绑定为当前Array Buffer对象
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        // 为Buffer对象在GPU端申请空间，并提供数据
        gl.bufferData(gl.ARRAY_BUFFER, // Buffer类型
           flatten(this.texcoords), // 数据来源
            gl.STATIC_DRAW // 表明是一次提供数据，多遍绘制
        );
        // 顶点数据已传至GPU端，可释放内存
        this.texcoords.length = 0;
    }
}

// 绘制几何对象
// 参数为模视矩阵
Obj.prototype.draw = function(matMV,material , tmpTexObj ) {
    // 设置为a_Position提供数据的方式
    if(this.vertexBuffer != null){
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    // 为顶点属性数组提供数据(数据存放在vertexBuffer对象中)
    gl.vertexAttribPointer(
        program.a_Position, // 属性变量索引
        3, // 每个顶点属性的分量个数
        gl.FLOAT, // 数组数据类型
        false, // 是否进行归一化处理
        0, // 在数组中相邻属性成员起始位置间的间隔(以字节为单位)
        0 // 第一个属性值在buffer中的偏移量
    );
    // 为a_Position启用顶点数组
    gl.enableVertexAttribArray(program.a_Position);
    }

    // 设置为a_Normal提供数据的方式
    if(this.normalBuffer != null){
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    // 为顶点属性数组提供数据(数据存放在vertexBuffer对象中)
    gl.vertexAttribPointer(
        program.a_Normal, // 属性变量索引
        3, // 每个顶点属性的分量个数
        gl.FLOAT, // 数组数据类型
        false, // 是否进行归一化处理
        0, // 在数组中相邻属性成员起始位置间的间隔(以字节为单位)
        0 // 第一个属性值在buffer中的偏移量
    );
    // 为a_Normal启用顶点数组
    gl.enableVertexAttribArray(program.a_Normal);
    }

    // 设置为a_Texcoord提供数据的方式
    if(this.texBuffer != null){
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    // 为顶点属性数组提供数据(数据存放在vertexBuffer对象中)
    gl.vertexAttribPointer(
        program.a_Texcoord, // 属性变量索引
        2, // 每个顶点属性的分量个数
        gl.FLOAT, // 数组数据类型
        false, // 是否进行归一化处理
        0, // 在数组中相邻属性成员起始位置间的间隔(以字节为单位)
        0 // 第一个属性值在buffer中的偏移量
    );
    // 为a_Texcoord启用顶点数组
    gl.enableVertexAttribArray(program.a_Texcoord);
    }

    var mtl;
    if(arguments.length>1 && arguments[1] != null )//提供了材质
    mtl = material;
    else
    mtl = this.material;

    //设置材质属性
   var ambientProducts = [];
   var diffuseProducts = [];
   var specularProducts = [];
   for (var i = 0; i < lights.length; i++) {
    if (i == 0) {//计算阳光时乘以光照率
        ambientProducts.push(mult(mult(lights[i].ambient, sunRate), mtl.ambient));
        diffuseProducts.push(mult(mult(lights[i].diffuse, sunRate), mtl.diffuse));
        specularProducts.push(mult(mult(lights[i].specular, sunRate), mtl.specular));
    }
    else {
        ambientProducts.push(mult(lights[i].ambient, mtl.ambient));
        diffuseProducts.push(mult(lights[i].diffuse, mtl.diffuse));
        specularProducts.push(mult(lights[i].specular, mtl.specular));
    }
}
   gl.uniform3fv(program.u_AmbientProduct,flatten(ambientProducts));
   gl.uniform3fv(program.u_DiffuseProduct,flatten(diffuseProducts));
   gl.uniform3fv(program.u_SpecularProduct,flatten(specularProducts));
   gl.uniform3fv(program.u_Emission,flatten(mtl.emission));

   gl.uniform1f(program.u_Shininess,mtl.shininess);  
   gl.uniform1f(program.u_Alpha,mtl.alpha);  
   
   //参数有提供纹理对象则用参数提供的纹理对象，否则用对象自己的纹理对象
   var texObj;
   if(arguments.length>2 && arguments[2]!= null)//提供了纹理对象
   texObj = tmpTexObj;
   else
   texObj = this.texObj;

   //纹理对象不为空则绑定纹理对象
   if(texObj != null&& texObj.complete)
        gl.bindTexture(gl.TEXTURE_2D,texObj.texture);


    // 开始绘制
    gl.uniformMatrix4fv(program.u_ModelView, false,
        flatten(matMV)); // 传MV矩阵
    gl.uniformMatrix3fv(program.u_NormalMat, false,
        flatten(normalMatrix(matMV))); // 传法向矩阵
    gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
}

// 在y=0平面绘制中心在原点的格状方形地面
// fExtent：决定地面区域大小(方形地面边长的一半)
// fStep：决定线之间的间隔
// 返回地面Obj对象
function buildGround(fExtent, fStep) {
    var obj = new Obj(); // 新建一个Obj对象
    var iterations = 2 * fExtent / fStep;//单层循环次数
    var fTexcoordStep = 40 / iterations;//纹理坐标递增步长

    for (var x = -fExtent , s= 0 ; x < fExtent; x += fStep,s+= fTexcoordStep) {
        for (var z = fExtent ,t = 0 ; z > -fExtent; z -= fStep , t+= fTexcoordStep) {
            // 以(x, 0, z)为左下角的单元四边形的4个顶点
            var ptLowerLeft = vec3(x, 0, z);
            var ptLowerRight = vec3(x + fStep, 0, z);
            var ptUpperLeft = vec3(x, 0, z - fStep);
            var ptUpperRight = vec3(x + fStep, 0, z - fStep);
            // 分成2个三角形
            obj.vertices.push(ptUpperLeft);
            obj.vertices.push(ptLowerLeft);
            obj.vertices.push(ptLowerRight);
            obj.vertices.push(ptUpperLeft);
            obj.vertices.push(ptLowerRight);
            obj.vertices.push(ptUpperRight);
            //顶点法向
            obj.normals.push(vec3(0,1,0));
            obj.normals.push(vec3(0,1,0));
            obj.normals.push(vec3(0,1,0));
            obj.normals.push(vec3(0,1,0));
            obj.normals.push(vec3(0,1,0));
            obj.normals.push(vec3(0,1,0));
            //纹理坐标
            obj.texcoords.push(vec2(s,t+fTexcoordStep));
            obj.texcoords.push(vec2(s,t));
            obj.texcoords.push(vec2(s+fTexcoordStep,t));
            obj.texcoords.push(vec2(s,t+fTexcoordStep));
            obj.texcoords.push(vec2(s+fTexcoordStep,t));
            obj.texcoords.push(vec2(s+fTexcoordStep,t+fTexcoordStep));
            obj.numVertices += 6;
        }
    }

    //设置地面材质
    obj.material.ambient = vec3(0.1,0.1,0.1);//环境反射系数
    obj.material.diffuse = vec3(0.8,0.8,0.8);//环境反射系数
    obj.material.specular = vec3(0.3,0.3,0.3);//环境反射系数
    obj.material.emission = vec3(0.0 ,0.0,0.0);//发射系数
    obj.material.shininess = 10;//高光系数

    return obj;
}

// 用于生成一个中心在原点的球的顶点数据(南北极在z轴方向)
// 返回球Obj对象，参数为球的半径及经线和纬线数
function buildSphere(radius, columns, rows) {
    var obj = new Obj(); // 新建一个Obj对象
    var vertices = []; // 存放不同顶点的数组

    for (var r = 0; r <= rows; r++) {
        var v = r / rows; // v在[0,1]区间
        var theta1 = v * Math.PI; // theta1在[0,PI]区间

        var temp = vec3(0, 0, 1);
        var n = vec3(temp); // 实现Float32Array深拷贝
        var cosTheta1 = Math.cos(theta1);
        var sinTheta1 = Math.sin(theta1);
        n[0] = temp[0] * cosTheta1 + temp[2] * sinTheta1;
        n[2] = -temp[0] * sinTheta1 + temp[2] * cosTheta1;

        for (var c = 0; c <= columns; c++) {
            var u = c / columns; // u在[0,1]区间
            var theta2 = u * Math.PI * 2; // theta2在[0,2PI]区间
            var pos = vec3(n);
            temp = vec3(n);
            var cosTheta2 = Math.cos(theta2);
            var sinTheta2 = Math.sin(theta2);

            pos[0] = temp[0] * cosTheta2 - temp[1] * sinTheta2;
            pos[1] = temp[0] * sinTheta2 + temp[1] * cosTheta2;

            var posFull = mult(pos, radius);

            vertices.push(posFull);
        }
    }

    /*生成最终顶点数组数据(使用三角形进行绘制)*/
    var colLength = columns + 1;
    for (var r = 0; r < rows; r++) {
        var offset = r * colLength;

        for (var c = 0; c < columns; c++) {
            var ul = offset + c; // 左上
            var ur = offset + c + 1; // 右上
            var br = offset + (c + 1 + colLength); // 右下
            var bl = offset + (c + 0 + colLength); // 左下

            // 由两条经线和纬线围成的矩形
            // 分2个三角形来画
            obj.vertices.push(vertices[ul]);
            obj.vertices.push(vertices[bl]);
            obj.vertices.push(vertices[br]);
            obj.vertices.push(vertices[ul]);
            obj.vertices.push(vertices[br]);
            obj.vertices.push(vertices[ur]);

            //球的法向与顶点坐标相同
            obj.normals.push(vertices[ul]);
            obj.normals.push(vertices[bl]);
            obj.normals.push(vertices[br]);
            obj.normals.push(vertices[ul]);
            obj.normals.push(vertices[br]);
            obj.normals.push(vertices[ur]);

            //纹理坐标
            obj.texcoords.push(vec2(c / columns, r / rows));
            obj.texcoords.push(vec2(c / columns, (r+1) / rows));
            obj.texcoords.push(vec2((c+1) / columns, (r+1) / rows));
            obj.texcoords.push(vec2(c / columns, r / rows));
            obj.texcoords.push(vec2((c+1) / columns, (r+1) / rows));
            obj.texcoords.push(vec2((c+1) / columns, r / rows));

        }
    }

    vertices.length = 0; // 已用不到，释放 
    obj.numVertices = rows * columns * 6; // 顶点数

    //设置球材质(蓝色)
    obj.material.ambient = vec3( 0.100000, 0.187250, 0.174500  ); // 环境光反射系数
    obj.material.diffuse = vec3( 0.05164, 0.0231, 0.8936); // 漫反射系数
    obj.material.specular = vec3( 0.297254, 0.308290, 0.306678 );// 镜面反射系数
    obj.material.alpha = 0.95;//透明度

    return obj;
}


// 生成正方形
// 参数为obj对象、存放立方体顶点数据的数组、四个顶点的索引
// a,b,c,d对应的顶点须为逆时针绕向
function quad(obj,vertices,a, b, c, d){
	// 计算四边形的两个不平行的边向量
	var u = subtract(vertices[b], vertices[a]);
	var v = subtract(vertices[c], vertices[b]);
		
	// 通过叉乘计算法向
	var normal = normalize(cross(u, v));

	obj.normals.push(normal); 
	obj.texcoords.push(vec2(0.0,0.0));
    obj.vertices.push(vertices[a]); 
    
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(1.0,0.0));
    obj.vertices.push(vertices[b]); 
    
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(1.0,1.0));
    obj.vertices.push(vertices[c]); 
    
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(0.0,0.0));
    obj.vertices.push(vertices[a]); 
    
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(1.0,1.0));
    obj.vertices.push(vertices[c]); 
    
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(0.0,1.0));
	obj.vertices.push(vertices[d]); 
}




// 获取shader中变量位置
function getLocation() {
    /*获取shader中attribute变量的位置(索引)*/
    program.a_Position = gl.getAttribLocation(program, "a_Position");
    if (program.a_Position < 0) { // getAttribLocation获取失败则返回-1
        console.log("获取attribute变量a_Position失败！");
    }
    program.a_Normal = gl.getAttribLocation(program, "a_Normal");
    if (program.a_Normal < 0) { // getAttribLocation获取失败则返回-1
        console.log("获取attribute变量a_Normal失败！");
    }
    program.a_Texcoord = gl.getAttribLocation(program, "a_Texcoord");
    if (program.a_Texcoord < 0) { // getAttribLocation获取失败则返回-1
        console.log("获取attribute变量a_Texcoord失败！");
    }

    /*获取shader中uniform变量的位置(索引)*/
    program.u_ModelView = gl.getUniformLocation(program, "u_ModelView");
    if (!program.u_ModelView) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_ModelView失败！");
    }
    program.u_Projection = gl.getUniformLocation(program, "u_Projection");
    if (!program.u_Projection) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Projection失败！");
    }
    program.u_NormalMat = gl.getUniformLocation(program, "u_NormalMat");
    if (!program.u_NormalMat) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_NormalMat失败！");
    }
    program.u_LightPosition = gl.getUniformLocation(program, "u_LightPosition");
    if (!program.u_LightPosition) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_LightPosition失败！");
    }
    program.u_Shininess = gl.getUniformLocation(program, "u_Shininess");
    if (!program.u_Shininess) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Shininess失败！");
    }
    program.u_AmbientProduct = gl.getUniformLocation(program, "u_AmbientProduct");
    if (!program.u_AmbientProduct) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_AmbientProduct失败！");
    }
    program.u_DiffuseProduct = gl.getUniformLocation(program, "u_DiffuseProduct");
    if (!program.u_DiffuseProduct) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_DiffuseProduct失败！");
    }
    program.u_SpecularProduct = gl.getUniformLocation(program, "u_SpecularProduct");
    if (!program.u_SpecularProduct) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_SpecularProduct失败！");
    }
    program.u_Emission = gl.getUniformLocation(program, "u_Emission");
    if (!program.u_Emission) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Emission失败！");
    }
    program.u_SpotDirection = gl.getUniformLocation(program, "u_SpotDirection");
    if (!program.u_SpotDirection) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_SpotDirection失败！");
    }
    program.u_SpotCutOff = gl.getUniformLocation(program, "u_SpotCutOff");
    if (!program.u_SpotCutOff) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_SpotCutOff失败！");
    }
    program.u_SpotExponent = gl.getUniformLocation(program, "u_SpotExponent");
    if (!program.u_SpotExponent) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_SpotExponent失败！");
    }
    program.u_LightOn = gl.getUniformLocation(program, "u_LightOn");
    if (!program.u_LightOn) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_LightOn失败！");
    }
    program.u_Sampler = gl.getUniformLocation(program, "u_Sampler");
    if (!program.u_Sampler) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Sampler失败！");
    }
    program.u_Alpha = gl.getUniformLocation(program, "u_Alpha");
    if (!program.u_Alpha) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Alpha失败！");
    }
    program.u_bOnlyTexture = gl.getUniformLocation(program, "u_bOnlyTexture");
    if (!program.u_bOnlyTexture) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_bOnlyTexture失败！");
    }
    program.u_FogColor = gl.getUniformLocation(program, "u_FogColor");
	if(!program.u_FogColor){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_FogColor失败！"); 
	}
	program.u_FogDist = gl.getUniformLocation(program, "u_FogDist");
	if(!program.u_FogDist){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_FogDist失败！"); 
	}
	program.u_bFogOn = gl.getUniformLocation(program, "u_bFogOn");
	if(!program.u_bFogOn){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_bFogOn失败！"); 
    
	}
    program.u_sunRate = gl.getUniformLocation(program, "u_sunRate");
	if (!program.u_sunRate) { // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_sunRate失败！");
	}
    /*获取programObj中attribute变量的位置(索引)*/
    attribIndex.a_Position = gl.getAttribLocation(programObj, "a_Position");
    if (attribIndex.a_Position < 0) { // getAttribLocation获取失败则返回-1
        console.log("获取attribute变量a_Position失败！");
    }
    attribIndex.a_Normal = gl.getAttribLocation(programObj, "a_Normal");
    if (attribIndex.a_Normal < 0) { // getAttribLocation获取失败则返回-1
        console.log("获取attribute变量a_Normal失败！");
    }
    attribIndex.a_Texcoord = gl.getAttribLocation(programObj, "a_Texcoord");
    if (attribIndex.a_Texcoord < 0) { // getAttribLocation获取失败则返回-1
        console.log("获取attribute变量a_Texcoord失败！");
    }
    /*获取programObj中uniform变量的位置(索引)*/
    mtlIndex.u_Ka = gl.getUniformLocation(programObj, "u_Ka");
    if (!mtlIndex.u_Ka) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Ka失败！");
    }
    mtlIndex.u_Kd = gl.getUniformLocation(programObj, "u_Kd");
    if (!mtlIndex.u_Kd) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Kd失败！");
    }
    mtlIndex.u_Ks = gl.getUniformLocation(programObj, "u_Ks");
    if (!mtlIndex.u_Ks) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Ks失败！");
    }
    mtlIndex.u_Ke = gl.getUniformLocation(programObj, "u_Ke");
    if (!mtlIndex.u_Ke) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Ke失败！");
    }
    mtlIndex.u_Ns = gl.getUniformLocation(programObj, "u_Ns");
    if (!mtlIndex.u_Ns) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Ns失败！");
    }
    mtlIndex.u_d = gl.getUniformLocation(programObj, "u_d");
    if (!mtlIndex.u_d) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_d失败！");
    }
    programObj.u_ModelView = gl.getUniformLocation(programObj, "u_ModelView");
    if (!programObj.u_ModelView) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_ModelView失败！");
    }
    programObj.u_Projection = gl.getUniformLocation(programObj, "u_Projection");
    if (!programObj.u_Projection) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Projection失败！");
    }
    programObj.u_NormalMat = gl.getUniformLocation(programObj, "u_NormalMat");
    if (!programObj.u_NormalMat) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_NormalMat失败！");
    }
    programObj.u_bOnlyTexture = gl.getUniformLocation(programObj, "u_bOnlyTexture");
    if (!programObj.u_bOnlyTexture) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_bOnlyTexture失败！");
    }
    programObj.u_LightPosition = gl.getUniformLocation(programObj, "u_LightPosition");
    if (!programObj.u_LightPosition) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_LightPosition失败！");
    }
    programObj.u_AmbientLight = gl.getUniformLocation(programObj, "u_AmbientLight");
    if (!programObj.u_AmbientLight) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_AmbientLight失败！");
    }
    programObj.u_DiffuseLight = gl.getUniformLocation(programObj, "u_DiffuseLight");
    if (!programObj.u_DiffuseLight) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_DiffuseLight失败！");
    }
    programObj.u_SpecularLight = gl.getUniformLocation(programObj, "u_SpecularLight");
    if (!programObj.u_SpecularLight) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_SpecularLight失败！");
    }
    programObj.u_Sampler = gl.getUniformLocation(programObj, "u_Sampler");
    if (!programObj.u_Sampler) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_Sampler失败！");
    }
    programObj.u_LightOn = gl.getUniformLocation(programObj, "u_LightOn");
    if (!programObj.u_LightOn) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_LightOn失败！");
    }
    programObj.u_SpotDirection = gl.getUniformLocation(programObj, "u_SpotDirection");
    if (!programObj.u_SpotDirection) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_SpotDirection失败！");
    }
    programObj.u_SpotCutOff = gl.getUniformLocation(programObj, "u_SpotCutOff");
    if (!programObj.u_SpotCutOff) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_SpotCutOff失败！");
    }
    programObj.u_SpotExponent = gl.getUniformLocation(programObj, "u_SpotExponent");
    if (!programObj.u_SpotExponent) { // getUniformLocation获取失败则返回null
        console.log("获取uniform变量u_SpotExponent失败！");
    }
    programObj.u_sunRate = gl.getUniformLocation(programObj, "u_sunRate");
	if (!programObj.u_sunRate) { // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_sunRate失败！");
	}
    programObj.u_FogColor = gl.getUniformLocation(programObj, "u_FogColor");
	if(!programObj.u_FogColor){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_FogColor失败！"); 
	}
	programObj.u_FogDist = gl.getUniformLocation(programObj, "u_FogDist");
	if(!programObj.u_FogDist){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_FogDist失败！"); 
	}
	
	programObj.u_bFogOn = gl.getUniformLocation(programObj, "u_bFogOn");
	if(!programObj.u_bFogOn){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_bFogOn失败！"); 
	}
}

var ground = buildGround(20.0, 0.1); // 生成地面对象

var lightTexObj ; //红色光源球所使用的纹理对象
var skyTexObj ; //天空球使用的纹理对象

var numSpheres = 30; // 场景中球的数目
// 用于保存球位置的数组，对每个球位置保存其x、z坐标
var posSphere = [];
var sphere = buildSphere(0.2, 15, 15); // 生成球对象

var textureLoaded = 0;//已加载完毕的纹理图
var numTextures=  7;//纹理图总数


var programObj;//obj模型绘制所使用的program
var attribIndex = new AttribIndex();//programObj中attribute变量索引
var mtlIndex = new MTLIndex();//programObj中材质变量索引


//雪花
function buildSnow(){
    var obj = new Obj();
    obj.numVertices = 24;// 绘制雪花使用顶点数(4个面*2个三角形*3个顶点)
    var vertices = [			// 雪花的12个顶点
		vec3(-0.5, -0.5,  0.5), // 左下前
		vec3(-0.5,  0.5,  0.5), // 左上前
		vec3( 0.5,  0.5,  0.5), // 右上前
		vec3( 0.5, -0.5,  0.5), // 右下前
		vec3(-0.5, -0.5, -0.5), // 左下后
		vec3(-0.5,  0.5, -0.5), // 左上后
		vec3( 0.5,  0.5, -0.5), // 右上后
        vec3( 0.5, -0.5, -0.5),  // 右下后
        
        vec3( -0.35, 0.0, -0.35), //左前点
        vec3( -0.35, 0.0, 0.35), //左后点
        vec3( 0.35, 0.0, -0.35), //右后
        vec3( 0.35, 0.0, 0.35), //右前

        vec3( -0.35, -0.35, 0.0), //左下点
        vec3( -0.35, 0.35, 0.0), //左上点
        vec3( 0.35, 0.35, 0.0), //右上
        vec3( 0.35, -0.35, 0.0), //右下
	];
	quad(obj,vertices,1, 2, 7, 4);	// 上
	quad(obj,vertices,0, 3, 6, 5);	// 下
	quad(obj,vertices,8, 10, 9, 11);	// 横中
	quad(obj,vertices,12, 13, 14, 15);	// 竖中
    
    //设置雪花材质
	obj.material.ambient = vec3(1.0, 1.0, 0.0);
	obj.material.diffuse = vec3(0.5, 0.5, 0.5);
	obj.material.specular = vec3(0.88, 0.88, 0.88);
	obj.material.emission = vec3(0.88, 0.88, 0.88);
	obj.material.shininess = 80;
	return obj;
}

var snow = buildSnow(); //生成雪花对象
var numTree1 = 40; // 场景中树1的数目
var posTree1 = [];  //树1位置
var numTree2 = 40; // 场景中石头2的数目
var posTree2 = [];  //树2位置

// 初始化场景中的几何对象
function initObjs() {
    // 初始化地面顶点数据缓冲区对象(VBO)
    ground.initBuffers();

    //初始化天空球纹理
    skyTexObj = loadTexture("Res\\senlin.jpeg",gl.RGB,true);//白天
    //skyTexObj = loadTexture("Res\\sky.jpg",gl.RGB,true);//白天
    starTexObj = loadTexture("Res\\stars.jpg", gl.RGB, true);//夜晚
    //初始化地面纹理，纹理为RGB图像，先不使用Mipmapping
    groundTexObj[0] = loadTexture("Res\\glass.bmp", gl.RGB, true);
    groundTexObj[1] = loadTexture("Res\\snowground.jpg", gl.RGB, true);

    //初始化球纹理
    sphere.texObj = loadTexture("Res\\sphere.jpg",gl.RGB,true);
    //初始化雪花纹理
    snow.texObj = loadTexture("Res\\white.jpg", gl.RGB, true);
    //初始化旋转球纹理
    lightTexObj = loadTexture("Res\\sun.bmp",gl.RGB,true);


    var sizeGround = 20;
    // 随机放置球的位置
    for (var iSphere = 0; iSphere < numSpheres; iSphere++) {
        // 在 -sizeGround 和 sizeGround 间随机选择一位置
        var x = Math.random() * sizeGround * 2 - sizeGround;
        var z = Math.random() * sizeGround * 2 - sizeGround;
        posSphere.push(vec2(x, z));
    }
     // 随机放置牵牛花的位置
	for (var iflower = 0; iflower < numFlower; iflower++) {
		// 在 -sizeGround 和 sizeGround 间随机选择一位置
		var xFlower = Math.random() * (sizeGround-1.5) * 2 - (sizeGround-1.5);
		var zFlower = Math.random() * (sizeGround-1.5) * 2 - (sizeGround-1.5);
        var yFlower = -0.55;
		posFlower.push(vec3(xFlower, yFlower,zFlower));
    }
     // 随机放置太阳花的位置
    for (var iSunflower = 0; iSunflower < numSunflower; iSunflower++) {
		// 在 -sizeGround 和 sizeGround 间随机选择一位置
		var xSunflower = Math.random() * (sizeGround-1.5) * 2 - (sizeGround-1.5);
		var zSunflower = Math.random() * (sizeGround-1.5) * 2 - (sizeGround-1.5);
        var ySunflower = -0.7;
		posSunflower.push(vec3(xSunflower,ySunflower, zSunflower));
    }
    // 随机放置雪花的位置
    for (var iSnow = 0; iSnow < numSnow; iSnow++) {
		// 在 -sizeGround 和 sizeGround 间随机选择一位置
		var xSnow = Math.random() * sizeGround * 2 - sizeGround;
        var zSnow = Math.random() * sizeGround * 2 - sizeGround;
        var ySnow =  Math.random() * 3 ;
		posSnow.push(vec3(xSnow, ySnow, zSnow));
    }
    // 随机放置树1的位置
	for (var iTree = 0; iTree < numTree1; iTree++) {
		// 在 -sizeGround 和 sizeGround 间随机选择一位置
		var xTree = Math.random() * (sizeGround -2) * 2 - (sizeGround-1.5);
        var zTree = Math.random() * (sizeGround -2) * 2 - (sizeGround-1.5);
        var yTree = -0.4;
		posTree1.push(vec3(xTree, yTree, zTree));
	}
	// 随机放置树2的位置
	for (var iTree = 0; iTree < numTree2; iTree++) {
		// 在 -sizeGround 和 sizeGround 间随机选择一位置
		var xTree = Math.random() * (sizeGround -2) * 2 - (sizeGround-1.5);
        var zTree = Math.random() * (sizeGround -2) * 2 - (sizeGround-1.5);
        var yTree = -0.4;
		posTree2.push(vec3(xTree, yTree, zTree));
	}

    // 初始化球顶点数据缓冲区对象(VBO)
    sphere.initBuffers();

    // 初始化立方体顶点数据缓冲区对象(VBO)
    snow.initBuffers();

}


// 页面加载完成后会调用此函数，函数名可任意(不一定为main)
window.onload = function main() {
    // 获取页面中id为webgl的canvas元素
    var canvas = document.getElementById("webgl");
    if (!canvas) { // 获取失败？
        alert("获取canvas元素失败！");
        return;
    }

    //获取hud
    var hud = document.getElementById("hud");
	if (!hud) {//获取失败？
		alert("获取canvas-hud元素！");
	}

    // 利用辅助程序文件中的功能获取WebGL上下文
    // 成功则后面可通过gl来调用WebGL的函数
    gl = WebGLUtils.setupWebGL(canvas,{alpha:false});
    if (!gl) { // 失败则弹出信息
        alert("获取WebGL上下文失败！");
        return;
    }

    	//获取二维绘图上下文
	ctx = hud.getContext('2d');

    // 设置雾化颜色
	var fogColor = new Float32Array([0.82,0.82,0.82]);
    //设置雾化距离
    var fogDist = new Float32Array([-10,10]); 


    /*设置WebGL相关属性*/
    gl.clearColor(0.0, 0.0, 0.5, 1.0); // 设置背景色为蓝色
    gl.enable(gl.DEPTH_TEST); // 开启深度检测
    gl.enable(gl.CULL_FACE); // 开启面剔除
    // 设置视口，占满整个canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);//打开混合
    //设置混合方式
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

    /*加载shader程序并为shader中attribute变量提供数据*/
    // 加载id分别为"vertex-shader"和"fragment-shader"的shader程序，
    // 并进行编译和链接，返回shader程序对象program
    program = initShaders(gl, "vertex-shader",
        "fragment-shader");

    //编译链接新的shader程序对象，使用的顶点shader和上面一样，但片元shader不同
    programObj = initShaders(gl,"vertex-shader","fragment-shaderNew");

    // 获取shader中变量位置
    getLocation();

    // 设置投影矩阵：透视投影，根据视口宽高比指定视域体
    matProj = perspective(35.0, // 垂直方向视角
        canvas.width / canvas.height, // 视域体宽高比
        0.1, // 相机到近裁剪面距离
        100.0); // 相机到远裁剪面距离

  
    gl.useProgram(program); // 启用该shader程序对象     
    //传投影矩阵
    gl.uniformMatrix4fv(program.u_Projection, false, flatten(matProj));  
    //本程序只用了0号纹理单元
    gl.uniform1i(program.u_Sampler,0);
    //启用雾化相关（program
    gl.uniform3fv(program.u_FogColor,fogColor);
	gl.uniform2fv(program.u_FogDist,fogDist);

    gl.useProgram(programObj);//启用新的program
    //启用雾化相关（programobj
    gl.uniform3fv(programObj.u_FogColor,fogColor);
	gl.uniform2fv(programObj.u_FogDist,fogDist);
    //传同样的投影矩阵
    gl.uniformMatrix4fv(programObj.u_Projection,false,flatten(matProj));
    //雾化计算开关
    passFogOn();
    // 初始化场景中的几何对象
    initObjs();
    //初始化光源
    initLights();
    //用鼠标控制镜头
	cameraHandlers();
};

// 按键响应
window.onkeydown = function() {
    switch (event.keyCode) {
        case 38: // Up
            matReverse = mult(matReverse, translate(0.0, 0.0, -0.1));
            matCamera = mult(translate(0.0, 0.0, 0.1), matCamera);
            break;
        case 40: // Down
            matReverse = mult(matReverse, translate(0.0, 0.0, -0.1));
            matCamera = mult(translate(0.0, 0.0, -0.1), matCamera);
            break;
        case 37: // Left
            matReverse = mult(matReverse, rotateY(1));
            matCamera = mult(rotateY(-1), matCamera);
            break;
        case 39: // Right
            matReverse = mult(matReverse, rotateY(-1));
            matCamera = mult(rotateY(1), matCamera);
            break;
        case 87: // W
            keyDown[0] = true;
            break;
        case 83: // S
            keyDown[1] = true;
            break;
        case 65: // A
            keyDown[2] = true;
            break;
        case 68: // D
            keyDown[3] = true;
            break;
        case 82:	//R，相机朝向前方
			cameraAngle[0] = rotateAngle;
			cameraAngle[1] = 0;
            break;
        case 32: // space
            if (!jumping) {
                jumping = true;
                jumpTime = 0;
            }
            break;
        case 77:	//M
			Step[count] = false;
			if(count <= 2)
				count++;
			Step[count] = true;

        case 49:    //'1' 环境光控制
        if(!LockSunLight){
            lights[0].on = !lights[0].on;
            passLightsOn();
            }            
            break;
        case 50:    //'2' 白色电筒控制
        if(!LockSunLight){
            lights[1].on = !lights[1].on;
            passLightsOn();
        }            
            break;
        case 70://'F' 雾化控制
        if(!LockSunLight){
            fogOn=!fogOn;
			passFogOn();
        }		    
			break;
        case 71://G 雪花控制
            if(!LockSunLight){
                snowOpen=!snowOpen;
            }
			break;
        case 76: // 'L' 开发者光源控制
            LockSunLight = !LockSunLight;
			break;
    }
    // 禁止默认处理(例如上下方向键对滚动条的控制)
    event.preventDefault();
}

// 按键弹起响应
window.onkeyup = function() {
    switch (event.keyCode) {
        case 87: // W
            keyDown[0] = false;
            break;
        case 83: // S
            keyDown[1] = false;
            break;
        case 65: // A
            keyDown[2] = false;
            break;
        case 68: // D
            keyDown[3] = false;
            break;
    }
}

// 记录上一次调用函数的时刻
var last = Date.now();
var bulidTime = 0;
var plusDay = true;

// 根据时间更新旋转角度
function animation() {
    // 计算距离上次调用经过多长的时间
    var now = Date.now();
    var elapsed = (now - last) / 1000.0; // 秒
    last = now;

    //兔子左转
	if(keyDown[2]){
		rotateAngle -= 2;
		rotateAngle %= 360;
	}
	
	//兔子右转
	if(keyDown[3]){
		rotateAngle += 2;
		rotateAngle %= 360;
	}

    // 更新动画状态
    yRot += deltaAngle * elapsed;
    sunAngle += deltaAngleSun * elapsed;

    // 防止溢出
    yRot %= 360;
    sunAngle %=360;

    //控制天数增加
    if( parseInt(sunAngle) == 355){
        if(plusDay){
            days++;
            weatherState= Math.floor(Math.random() * 3);
            console.log("weatherState:"+weatherState);
        }
        plusDay = false;
    }else if(parseInt(sunAngle) != 355)
        plusDay = true;

    // 跳跃处理
    jumpTime += elapsed;
    if (jumping) {
        jumpY = initSpeed * jumpTime - 0.8 * g * jumpTime * jumpTime;
        if (jumpY <= 0) {
            jumpY = 0;
            jumping = false;
        }
    }
    //不同天气下饱食度和水量
    if(weatherState==0){
        waterPoint-=elapsed*0.2;
        foodPoint-=elapsed*0.5;
    }else if(weatherState == 1 ){
        waterPoint-=elapsed*0.5;
        foodPoint-=elapsed*0.2;
    }else{
        waterPoint-=elapsed*0.4;
        foodPoint-=elapsed*0.4;
    }
    //水量上限
    if(waterPoint>=120)
        waterPoint=120;
    else if(waterPoint<=0.0)
        waterPoint=0;

    //食物上限
    if(foodPoint>=120)
        foodPoint = 120;
    else if(foodPoint<=0.0)
        foodPoint = 0;    
    
    if(waterPoint<=40&&foodPoint<=40){//健康值低掉血
        //控制生命值（能量值）
        life -= elapsed.toFixed(2);
        if(life<0)
        life=0;
    }

    bulidTime += 1.0 * elapsed;
    //控制雪花
    if(weatherState == 1 || snowOpen){
        yTrans+=0.001;
       if(yTrans>2)
           yTrans = 0;
   }
   
   //控制雾化   
   if(weatherState == 2 && LockSunLight){
       fogOn = true;
       passFogOn();
   }
   else if(weatherState != 2 && LockSunLight){
       fogOn = false;
       passFogOn();
   }

}

// 更新照相机变换
function updateCamera() {
	var angleTemp = rotateAngle * Math.PI / 180.0; //转化为弧度
	var sinTemp =  0.1*Math.sin(angleTemp);
	var cosTemp = 0.1* Math.cos(angleTemp);
	
	// 照相机前进
	if(keyDown[0]){
		matReverse = mult(matReverse, translate(sinTemp, 0.0, -cosTemp));
		matCamera = mult(translate(-sinTemp, 0.0, cosTemp), matCamera);
	}
	
	// 照相机后退
	if(keyDown[1]){
		matReverse = mult(matReverse, translate(-sinTemp, 0.0, cosTemp));
		matCamera = mult(translate(sinTemp, 0.0, -cosTemp), matCamera);
	}
    collide();//碰撞检测
}


// 绘制函数
function render() {

    //检查是否一切就绪，否则请求重绘，并返回
    //这样稍后系统又会调用render重新检查相关状态
    if(!objTree1.isAllReady(gl)||!objRabbit.isAllReady(gl)||!objTree2.isAllReady(gl)
    ||!objFlower.isAllReady(gl)||!objSunflower.isAllReady(gl)){
        requestAnimationFrame(render);//请求重绘
        return;//返回
    }

    animation(); // 更新动画参数

    updateCamera(); // 更新相机变换

    // 清颜色缓存和深度缓存
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   
    // 模视矩阵初始化为照相机变换矩阵
	var matTmp = mult(translate(0.0, -0.3, -3.0 + distance),//移动
					rotateX(cameraAngle[1])); //旋转角度
		matTmp = mult(matTmp, rotateY(cameraAngle[0])); 
		
	var matMV = mult(matTmp, matCamera);

    //为光源位置数组传值
    var lightPositions = [];

    //决定旋转球位置的变换
    lightPositions.push(mult(matMV,lightSun.pos));
    lightPositions.push(lightWhite.pos);

    //传观察坐标系下光源位置/方向
    gl.useProgram(program);
    gl.uniform4fv(program.u_LightPosition,flatten(lightPositions));
    gl.useProgram(programObj);
    gl.uniform4fv(programObj.u_LightPosition,flatten(lightPositions));

    /*绘制obj模型*/
    //rabbit
    gl.useProgram(programObj);
    mvStack.push(matMV);
    matMV = mult(matMV, translate(matReverse[3], -0.4 + jumpY , matReverse[11]));	//x,z与相机相同
    matMV = mult(matMV,scale(0.0005,0.0005,0.0005));
    matMV = mult(matMV, rotateY(-rotateAngle + 180));
    gl.uniform1f(programObj.u_sunRate, sunRate);
    gl.uniformMatrix4fv(programObj.u_ModelView,false,flatten(matMV));//传MV矩阵
    gl.uniformMatrix3fv(programObj.u_NormalMat,false,flatten(normalMatrix(matMV)));//传法向矩阵
    objRabbit.draw(gl,attribIndex,mtlIndex,programObj.u_Sampler);
    matMV = mvStack.pop();


    //绘制花
    drawFlowerObj(matMV, 0, 8, 0, 4);
    if (bulidTime > 25) {
        collisionFlower = 10;
        collisionSunflower = 5;
        drawFlowerObj(matMV, 8, 10, 4, 5);
    }
    if (bulidTime > 50) {
        collisionFlower = 12;
        collisionSunflower = 6;
        drawFlowerObj(matMV, 10, 12, 5, 6);
    }
    if(bulidTime > 75){
        collisionFlower = 14;
        collisionSunflower = 7;
        drawFlowerObj(matMV,12,14,6,7);
    }
    if(bulidTime > 100){
        collisionFlower = 16;
        collisionSunflower = 8;
        drawFlowerObj(matMV,14,16,7,8);
    }
    if(bulidTime > 125){
        collisionFlower = 18;
        collisionSunflower = 9;
        drawFlowerObj(matMV,16,18,8,9);
    }     
    if(bulidTime > 150){
        collisionFlower = 20;
        collisionSunflower = 10;
        drawFlowerObj(matMV,18,20,9,10);
    }   
    if(bulidTime > 175){
        collisionFlower = 22;
        collisionSunflower = 11;
        drawFlowerObj(matMV,20,22,10,11);
    } 
    if(bulidTime > 200){
        collisionFlower = 24;
        collisionSunflower = 12;
        drawFlowerObj(matMV,22,24,11,12);
    }

    //后面这些对象使用的都是这个program
    gl.useProgram(program);
    //绘制天空球
    gl.disable(gl.CULL_FACE);//关闭背面剔除
    mvStack.push(matMV);//不让天空球的变换影响后面对象
    matMV = mult(matMV,scale(150.0,150.0,150.0));//放大到足够大倍数
    matMV = mult(matMV , rotateX(90));//调整南北极
    gl.uniform1i(program.u_bOnlyTexture,1);//让u_bonlytex为真

    //昼夜变化处理
    if (sunAngle >= 180) { //夜
		gl.uniform1i(program.u_bOnlyTexture, 0);//不只计算纹理
		sphere.draw(matMV, null, starTexObj);
        isNight = true;
	}
	else { //白天
		gl.uniform1i(program.u_bOnlyTexture, 0);//不只计算纹理
		sphere.draw(matMV, mtlSky, skyTexObj);
        isNight = false;
	}
	gl.uniform1i(program.u_bOnlyTexture, 0);//不止计算纹理
	matMV = mvStack.pop();
	gl.enable(gl.CULL_FACE);//开启背面剔除


    /*绘制地面*/
    mvStack.push(matMV);
    // 将地面移到y=-0.4平面上
    matMV = mult(matMV, translate(0.0, -0.4, 0.0));
	if(LockSunLight){
			if(weatherState == 1)
            	ground.draw(matMV,null,groundTexObj[1]);            
        	else
                ground.draw(matMV,null,groundTexObj[0]);
		}
		else{
			if(snowOpen)
            	ground.draw(matMV,null,groundTexObj[1]);
        	else
            	ground.draw(matMV,null,groundTexObj[0]);
		}
    matMV = mvStack.pop();

    /*绘制每个球体*/
    for (var i = 0; i < numSpheres; i++) {
        mvStack.push(matMV);
        matMV = mult(matMV, translate(posSphere[i][0], -0.2, posSphere[i][1])); // 平移到相应位置
        matMV = mult(matMV, rotateX(90)); // 调整南北极
        sphere.draw(matMV);
        matMV = mvStack.pop();
    }

    // 将后面的模型往-z轴方向移动
    // 使得它们位于摄像机前方(也即世界坐标系原点前方)
    matMV = mult(matMV, translate(0.0, 0.0, -2.5));

    drawTreeObj(matMV);	//绘制树林
    
    gl.useProgram(program);
    //绘制雪花
    if(LockSunLight){
        if(weatherState == 1){
            for(var i = 0;i<numSnow;i++){
                gl.disable(gl.CULL_FACE); //关闭背面剔除
                mvStack.push(matMV); //使得对圆环的变换不影响旋转球
                matMV = mult(matMV, translate(posSnow[i][0],
                     posSnow[i][1] - yTrans, posSnow[i][2]));
                matMV = mult(matMV, rotateY(yRot*(Math.random()+1.0)));
                matMV = mult(matMV, scale(0.01, 0.05, 0.05));
                snow.draw(matMV);
                matMV = mvStack.pop();
                gl.enable(gl.CULL_FACE); //重新开启背面剔除
            }
        }    
    }else{
        if(snowOpen){
            for(var i = 0;i<numSnow;i++){
                gl.disable(gl.CULL_FACE); //关闭背面剔除
                mvStack.push(matMV); //使得对圆环的变换不影响旋转球
                matMV = mult(matMV, translate(posSnow[i][0],
                     posSnow[i][1] - yTrans, posSnow[i][2]));
                matMV = mult(matMV, rotateY(yRot*(Math.random()+1.0)));
                matMV = mult(matMV, scale(0.01, 0.05, 0.05));
                snow.draw(matMV);
                matMV = mvStack.pop();
                gl.enable(gl.CULL_FACE); //重新开启背面剔除
            }
        }
    }

    /*绘制太阳*/
	mvStack.push(matMV);
	// 调整南北极后先旋转再平移
	matMV = mult(matMV, rotateZ(sunAngle));
	matMV = mult(matMV, translate(24.0, 0.0, 0.0));
	matMV = mult(matMV, rotateX(90)); // 调整南北极
	matMV = mult(matMV, scale(5.0, 5.0, 5.0));
	sphere.draw(matMV, mtlSunLight, lightTexObj);
	matMV = mvStack.pop();
     //绘制太阳
     if (sunAngle <= 90) {
        sunRate = sunAngle / 100 + 0.1;
            }
        else if (sunAngle > 90 && sunAngle < 180) {
            sunRate = 1.0 - ((sunAngle - 90) / 100);
        }
        else if (sunAngle >= 180) {
            sunRate = 0.1;
        }
        mtlSky.emission = vec3(sunRate, sunRate, sunRate);
    
        draw2DInfo();
    requestAnimFrame(render); // 请求重绘
    over();//是否游戏结束
}

//绘制树
function drawTreeObj(matMV){
	//树1obj
	for (var i = 0; i < numTree1; i++) {
		gl.useProgram(programObj);
		mvStack.push(matMV);
		matMV = mult(matMV, rotateX(360));
		matMV = mult(matMV, translate(posTree1[i][0], posTree1[i][1], posTree1[i][2])); // 平移到相应位置
		matMV = mult(matMV, scale(0.1, 0.1, 0.1));
		gl.uniformMatrix4fv(programObj.u_ModelView, false, flatten(matMV));
		objTree1.draw(gl, attribIndex, mtlIndex, programObj.u_Sampler);
		matMV = mvStack.pop();
	}
	//树2obj
	for (var i = 0; i < numTree2; i++) {
		gl.useProgram(programObj);
		mvStack.push(matMV);
		matMV = mult(matMV, rotateY(90));
		matMV = mult(matMV, translate(posTree2[i][0], posTree2[i][1], posTree2[i][2])); // 平移到相应位置
		matMV = mult(matMV, scale(0.0005, 0.0005, 0.0005));
		gl.uniformMatrix4fv(programObj.u_ModelView, false, flatten(matMV));
		objTree2.draw(gl, attribIndex, mtlIndex, programObj.u_Sampler);
		matMV = mvStack.pop();
	}
}
//绘制花
function drawFlowerObj(matMV,iFlowers,maxFlower,iSunflowers,maxSunflowers){
    for (var i = iFlowers; i < maxFlower; i++) {
        gl.useProgram(programObj);
        mvStack.push(matMV);
		matMV = mult(matMV, translate(posFlower[i][0],posFlower[i][1], posFlower[i][2])); // 平移到相应位置
        matMV=mult(matMV,scale(0.0005,0.0005,0.0005));
        matMV = mult(matMV, rotateY(360));
        gl.uniformMatrix4fv(programObj.u_ModelView,false,flatten(matMV));
        objFlower.draw(gl,attribIndex,mtlIndex,programObj.u_Sampler);
        matMV = mvStack.pop();
    }
    for (var i = iSunflowers; i < maxSunflowers; i++) {
        gl.useProgram(programObj);
		mvStack.push(matMV);
		matMV = mult(matMV, translate(posSunflower[i][0],posSunflower[i][1], posSunflower[i][2])); // 平移到相应位置
        matMV=mult(matMV,scale(0.06,0.06,0.06));
        matMV = mult(matMV, rotateY(360));
	    gl.uniformMatrix4fv(programObj.u_ModelView,false,flatten(matMV));
		objSunflower.draw(gl,attribIndex,mtlIndex,programObj.u_Sampler);
		matMV = mvStack.pop();
    }
}

var showMap = true;	//是否显示小地图
var showInfo = true; //是否绘制操作说明
var ctx;
function draw2DInfo(){
	ctx.clearRect(0, 0, 1600, 900);

    var img = new Image();	//新建图片对象
	if(Step[0]){
		img.src = "Res\\title.png";
		ctx.drawImage(img, 0,0);
		ctx.font = '50px "宋体"';	//设置字体
		ctx.fillStyle = 'rgba(0, 0, 0, 1)';	//设置文本颜色
		ctx.fillText('按 M 继续', 700, 750);	//文本内容
	}
    if(Step[1]){
    if(showMap) {//绘制小地图
		//边框
		ctx.beginPath();
		ctx.moveTo(10, 10);
		ctx.lineTo(230, 10);
		ctx.lineTo(230, 230);
		ctx.lineTo(10, 230);
		ctx.closePath();
		ctx.lineWidth = 2;
		ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
		ctx.stroke();	
		//草坪
		ctx.fillStyle = 'rgba(0, 255, 127, 0.8)';
		ctx.fillRect(10, 10, 220, 220);	
		//兔子的坐标
		var rabbitPosX = matReverse[3];
		var rabbitPosZ = matReverse[11];
		//兔子点绘制
		ctx.fillStyle = 'rgba(128, 128, 128, 1.0)';
		var pX = 110 + (rabbitPosX * 10) / 2;
		var pY = 120 + (rabbitPosZ * 10) / 2;
		ctx.fillRect(pX, pY, 10, 10);

        for(i=0; i<numSpheres; i++){
            //球的坐标
		    var spherePosX = posSphere[i][0];
		    var spherePosZ = posSphere[i][1];
		    //球绘制
		    ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
		    var spherePX = 110 + (spherePosX * 10) / 2;
		    var spherePY = 120 + (spherePosZ * 10) / 2;
		    ctx.fillRect(spherePX, spherePY, 5, 5);
        }
        for(i=0; i<collisionFlower; i++){
            //牵牛花的坐标
            var flowerPosX = posFlower[i][0];
            var flowerPosZ = posFlower[i][2];
            //牵牛花绘制
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            var flowerPX = 110 + (flowerPosX * 10) / 2;
            var flowerPY = 120 + (flowerPosZ * 10) / 2;
            ctx.fillRect(flowerPX, flowerPY, 5, 5);
        }
       for(i=0; i<collisionSunflower; i++){
            //太阳花的坐标
            var sunflowerPosX = posSunflower[i][0];
            var sunflowerPosZ = posSunflower[i][2];
            //太阳花绘制
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            var sunflowerPX = 110 + (sunflowerPosX * 10) / 2;
            var sunflowerPY = 120 + (sunflowerPosZ * 10) / 2;
            ctx.fillRect(sunflowerPX, sunflowerPY, 5, 5);
        }       
	}
	ctx.beginPath();
	ctx.strokeStyle = 'rgba(186,63,84,1)';
	ctx.stroke();
    ctx.font = "15px Arial";
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillText("红点为牵牛花，绿点为太阳花，",20,250);    
    ctx.fillText("蓝点为水球，灰色点为兔子位置。",20,265); 
    ctx.font = "20px Arial";
    ctx.fillText("开发者光源控制键：L", 20, 300);
    ctx.fillStyle = 'rgba(253,255,147,1)';
    ctx.fillText("当前水量："+waterPoint.toFixed(2)+"/120", 20, 325);
    ctx.fillText("当前饱食度："+foodPoint.toFixed(2)+"/120", 20, 350);
    ctx.fillText("当前生命life："+life.toFixed(2)+"/100", 20, 375);

	if(!LockSunLight) {//绘制开发者光源控制信息
        ctx.font = "30x Arial";
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillText("环境光开关：[1]", 20, 450);
        ctx.fillText("白色电筒开关：[2]", 20, 490);
        ctx.fillText("雾气开关：[F]", 20, 530);
        ctx.fillText("雪花开关：[G]", 20, 570);
    }
    //绘制操作说明
    if(showInfo){
        //绘制按键背景
        ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
		ctx.fillRect(1380, 500, 50, 50);
        ctx.fillRect(1320, 560, 50, 50);
        ctx.fillRect(1380, 560, 50, 50);
        ctx.fillRect(1440, 560, 50, 50);

        //绘制按键
        ctx.font = "40px Arial";
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillText("W", 1385,540);
        ctx.fillText("A", 1330,600);
        ctx.fillText("S", 1390,600);
        ctx.fillText("D", 1450,600);

        //绘制说明
        ctx.font = "20px Arial";
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillText("WASD控制兔子移动。", 1200,625);
        ctx.fillText('鼠标拖动：控制相机朝向', 1200, 650);
        ctx.fillText('空格键：控制跳跃', 1200, 675);
		ctx.fillText('R：恢复相机朝向', 1200, 700);
        ctx.fillText("触碰花朵吃下增加饱食度", 1200,725);
        ctx.fillText("触碰水球增加水量", 1200,750);
        ctx.fillText("不同天气下饱食度和水量会有不同程度的减少。", 1200,775);	
		ctx.fillText("在水球有限的情况下尽可能生活下去吧！", 1200, 800);


        ctx.fillText("天数："+days, 20, 800);
        ctx.fillText("2018031701026 吴倩莹", 750, 840);
    }


    //绘制天气信息
	if(weatherState == 0){
        ctx.font = "30px Arial";
        ctx.fillStyle = 'rgba(180,50,50,1)';
        if(isNight)
        ctx.fillText("天气：晴天-夜晚", 20, 720);
        else
        ctx.fillText("天气：晴天-白天", 20,720);
        ctx.fillText("能见度：良好", 20, 760);
    }	
	else if(weatherState == 1){     
        ctx.fillStyle = 'rgba(255,255,255,1)';   
		if(isNight)
        ctx.fillText("天气：小雪-夜晚", 20, 720);
        else
        ctx.fillText("天气：小雪-白天", 20, 720);
        ctx.fillText("能见度：一般", 20, 760);
    }
	else{
        ctx.fillStyle = 'rgba(128,128,128,1)';  
        if(isNight)
        ctx.fillText("天气：大雾-夜晚", 20, 720);
        else
        ctx.fillText("天气：大雾-白天", 20, 720);
        ctx.fillText("能见度：差", 20, 760);
    }  
}
}

//碰撞检测
function collide() {
    var x = matReverse[3];
    var z = matReverse[11];
  
    var isCollision = false; //是否发生碰撞
	
	//与边界碰撞
	if(x < -sizeGround || x > sizeGround || z < -sizeGround || z > sizeGround) //边界检测
	{
		isCollision = true;
	}
	
	if(isCollision){	//是否发生碰撞
		var angleTemp = rotateAngle * Math.PI / 180.0;	//转为弧度
		var sinTemp = 0.1 * Math.sin(angleTemp);
		var cosTemp = 0.1 * Math.cos(angleTemp);
		if(keyDown[0]){ //前进
			matReverse = mult(matReverse, translate(-sinTemp, 0.0, cosTemp));
			matCamera = mult(translate(sinTemp, 0.0, -cosTemp), matCamera);
		}
		if(keyDown[1]){ //后退
			matReverse = mult(matReverse, translate(sinTemp, 0.0, -cosTemp));
			matCamera = mult(translate(-sinTemp, 0.0, cosTemp), matCamera);
		}        
	}
    //和牵牛花碰撞
    for (var i = 0; i < collisionFlower; i++) {
        if (i < numFlower) {
            if (Math.abs(posFlower[i][0] - x) <= 0.2 //x
                && Math.abs(posFlower[i][2] - z) <= 0.2) //z
            {
                posFlower[i][0] = mult(posFlower[i][0], translate(0.0, 0.1, 0.0));
                posFlower[i][2] = mult(posFlower[i][0], translate(0.0, -0.1, 0.0));
                foodPoint+=10;
                console.log("当前吃到的花是："+i);
                if(i==0)
                foodPoint+=50;
                break;
            }
        }
    }
    //和太阳花碰撞
    for (var i = 0; i < collisionSunflower; i++) {
        if (i < numSunflower) {
            if (Math.abs(posSunflower[i][0] - x) <= 0.2 //x
                && Math.abs(posSunflower[i][2] - z) <= 0.2) //z
            {
                posSunflower[i][0] = mult(posSunflower[i][0], translate(0.0, 0.1, 0.0));
                posSunflower[i][2] = mult(posSunflower[i][0], translate(0.0, -0.1, 0.0));
                foodPoint+=20;
                break;
            }
        }
    }
    //和球碰撞
    for (var i = 0; i < numSpheres; i++) {
        if (i < numSpheres) {
            if (Math.abs(posSphere[i][0] - x) <= 0.3 //x
                && Math.abs(posSphere[i][1] - z) <= 0.25) //z
            {
                posSphere[i][0] = mult(posSphere[i][0], translate(0.0, 0.1, 0.0));
                posSphere[i][1] = mult(posSphere[i][0], translate(0.0, -0.1, 0.0));
                waterPoint+=20;
                break;
            }
        }
    }
}
var gameOver = false;//游戏胜负判定
//是否游戏结束
function over(){
    if(life <= 0.1&&days<=5){
        alert("很不幸，你死了。你存活了"+days+"天。");
        gameOver = true;
    }
    else if(life<=0.1&&days>5){
        alert("还行吧，活了"+days+"天。");
    }
    else if(life<=0.1&&days>10){
        alert("有点东西，活了"+days+"天。");
    }
    else if(life<=0.1&&days>15){
        alert("厉害呀！你存活了"+days+"天。");
    }
    else if(life<=0.1&&days>20){
        alert("太牛辣！！你存活了"+days+"天。");
    }
    if(waterPoint<=0.1){
        alert("渴死了。");
        gameOver = true;
    }
    if(foodPoint<=0.1){
        alert("饿死了。");
        gameOver = true;
    }
}

//用鼠标控制镜头
function cameraHandlers(){
	var dragging = false;	//是否拖动
	var lastX = -1, lastY = -1;	//鼠标最后的位置
	
	document.onmousedown = function(ev){
		var x = ev.clientX;
		var y = ev.clientY;		
		var rect = ev.target.getBoundingClientRect();
		if(rect.left <= x && x < rect.right &&
			rect.top <= y && y < rect.bottom)
		{
			lastX = x;
			lastY = y;
			dragging = true;
		}
	};	
	document.onmouseup = function(ev){
		dragging = false;
	};
	document.onmousemove = function(ev){
		if(dragging) //拖动中
        {
			var x = ev.clientX;
			var y = ev.clientY;
			
			var dx = x - lastX;
			var dy = y - lastY;
			
			cameraAngle[0] += (-dx / 10); //左右
			cameraAngle[1] += (-dy / 10); //上下
			if(cameraAngle[1] > 45) cameraAngle[1] = 45;
			else if(cameraAngle[1] < -9.5) cameraAngle[1] = -9.5;

			lastX = x;
			lastY = y;
		}
	};
}
