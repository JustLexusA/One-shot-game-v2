// function createLevel(){
//   // remove old platforms and weapons
//   try{
//     for(let p of platforms) World.remove(world, p);
//     for(let w of weapons){ if(w._constraint) World.remove(world, w._constraint); World.remove(world, w); }
//   }catch(e){}
//   platforms = [];
//   weapons = [];

//   // main platforms (positions scaled to canvas)
//   let mid = Bodies.rectangle(width/2, Math.floor(height*0.62), Math.max(220, Math.floor(width*0.42)), 24, {isStatic:true, label:'platform'});
//   let left = Bodies.rectangle(Math.floor(width*0.22), Math.floor(height*0.52 + random(-30,30)), 160, 20, {isStatic:true, label:'platform'});
//   let right = Bodies.rectangle(Math.floor(width*0.78), Math.floor(height*0.52 + random(-30,30)), 160, 20, {isStatic:true, label:'platform'});
//   World.add(world, [mid,left,right]);
//   platforms = [mid,left,right];

//   // mini platforms below for easier survival
//   // more mini platforms below for easier survival
//   for(let i=0;i<6;i++){
//     let px = Math.floor(width*(0.08 + 0.84*Math.random()));
//     let py = Math.floor(height*(0.68 + 0.05*(i%3)));
//     let w = 60 + Math.floor(80*Math.random());
//     let mini = Bodies.rectangle(px, py, w, 12, {isStatic:true, label:'platform'});
//     World.add(world, mini);
//     platforms.push(mini);
//   }

//   // floating platforms above main stage for vertical movement
//   for(let i=0;i<4;i++){
//     let fx = Math.floor(width*(0.2 + 0.6*Math.random()));
//     let fy = Math.floor(height*(0.36 + 0.08*i));
//     let fw = 90 + Math.floor(120*Math.random());
//     let floatPlat = Bodies.rectangle(fx, fy, fw, 12, {isStatic:true, label:'platform'});
//     World.add(world, floatPlat);
//     platforms.push(floatPlat);
//   }

//   // side small platforms near edges
//   let sideL = Bodies.rectangle(Math.floor(width*0.06), Math.floor(height*0.5), 90, 12, {isStatic:true, label:'platform'});
//   let sideR = Bodies.rectangle(Math.floor(width*0.94), Math.floor(height*0.5), 90, 12, {isStatic:true, label:'platform'});
//   World.add(world, [sideL, sideR]);
//   platforms.push(sideL, sideR);

//   // weapons near center
//   let w1 = Bodies.rectangle(width/2 - 70, Math.floor(height*0.54), 140, 10, {label:'weapon', friction:0.3, restitution:0.2});
//   let w2 = Bodies.rectangle(width/2 + 70, Math.floor(height*0.54), 140, 10, {label:'weapon', friction:0.3, restitution:0.2});
//   World.add(world, [w1,w2]);
//   weapons = [w1,w2];
// }