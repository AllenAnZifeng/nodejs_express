'use strict';

// Created by Allen An at 2020/7/26

let promise = new Promise(function(resolve, reject) {
    // 不花时间去做这项工作
    resolve(123); // 立即给出结果：123
});
let a = promise.then((a)=>{
    return a
})

console.log(a);