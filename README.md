# gulp-cmd-packer

##说明

* 以新思路来解决使用seajs后，对文件进行打包的问题

* 一步完成所有文件的transport和concat，不像grunt-cmd-transport和grunt-cmd-concat那样分为两步

* 递归处理.js和.tpl，每用到一个文件，就把运行中间结果缓存下来，相当于被依赖的文件就已经处理完了

    因此，处理速度较快，1000个文件，耗时约1分钟(win 7, i7-4790, 16G)，这取决于你的文件内容、硬件水平等

* 只实现了相对依赖合并，并且是递归的。比如：a相对引用b，b相对引用c，c相对引用d

    那么: a的依赖是[b,c,d]， 内容也是[b,c,d]; b的依赖是[c,d]， 内容也是[c,d]
    

## 安装

```bash
$ npm install --save-dev gulp-cmd-packer
```

## 使用

用法和像grunt-cmd-transport也很像，看看代码应该就差不多了

如果有问题 [梅雪香](mailto:wy_hd@163.com)