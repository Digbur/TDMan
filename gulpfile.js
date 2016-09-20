'use strict';

var gulp 	= require('gulp');
var gp 		= require('gulp-load-plugins')();

var browserify 	= require('browserify'),
    source 	= require('vinyl-source-stream'),
    buffer 	= require('vinyl-buffer'),
    del 	= require('del'),
    bowerDep 	= require('main-bower-files'),
    flatten 	= require('gulp-flatten');

var browserSync = require('browser-sync'),
    reload 	= browserSync.reload;
var nodemon 	= require('gulp-nodemon');

var babel 	= function() {
	  return gp.babel({
	    presets: ['es2015']
	});
};

var wiredep 	= require('wiredep').stream;

// @Main serving section
// @TODO: adjust this below
gulp.task('noserved', ['hooks', 'extras', 'fnt', 'img', 'clientjs', 'sass', 'css', 'html', 'app', 'serverjs'], function(){
	// Just in case if you've done a lot coding/styling with no running servers to skip running tasks one-by-one
});

gulp.task('serve', ['browser-sync'], function () {

	// watchdogs for development changes
	gulp.watch('source/public/styles/**/*.scss', ['sass']);
	gulp.watch('source/public/styles/**/*.css', ['css']);
	gulp.watch('source/public/scripts/**/*.js', ['clientjs']);
	gulp.watch('source/public/views/*.html', ['html']);
	gulp.watch('source/public/images/*.*', ['img']);
	gulp.watch('source/public/fonts/*.*', ['fnt']);
	gulp.watch('source/public/extras/*.*', ['extras']);
	gulp.watch('source/server/**/*.*', ['serverjs']);
	gulp.watch('source/app.js', ['app']);
	// additional watchdogs
	gulp.watch('bower.json', ['hooks']);
	//gulp.watch('bower.json', ['wiredep', 'hooks']);

});

gulp.task('browser-sync', ['nodemon'], function() {
	browserSync.init(null, {
		notify: true,
		proxy: "http://localhost:5000",
    		files: ["app/public/**/*.*"],
      		port: 9000,
    	ui: {
      		port: 9090
		}
	});
	gulp.src(__filename)
  .pipe(gp.open({uri: 'http://localhost:9090'}));
	gulp.src('source/logs/applogs.log')
  .pipe(gp.open({app : 'google-chrome'}));
});

gulp.task('nodemon', function (cb) {
	var started = false;
	return nodemon({
		script: 'app/app.js',
		ignore: ['app/public/**/*.*'],
		watch: ['app/app.js', 'app/server/**/*.*']
	}).on('start', function () {
		if (!started) {
			cb();
			started = true;
		}
	});
});

// @HTML parsers / helpers

gulp.task('html', ['htmlparse'], function() {
	return gulp.src('app/public/views/*.html')
	//.pipe(wiredep())
	.pipe(gp.useref({
		searchPath: 'app/public'
	}))
	.pipe(gp.size({title: 'Production', showFiles: true}))
	.pipe(gulp.dest('app/public/views'));
})

gulp.task('htmlparse', function() {
	return gulp.src('source/public/views/*.html')
	.pipe(gp.htmlmin({collapseWhitespace: false}))
	.pipe(gulp.dest('app/public/views'));
})

// @CSS parsers / helpers

gulp.task('sass', function() {
	return gulp.src('source/public/styles/**/*.scss')
	.pipe(gp.sass.sync({
		outputStyle: 'expanded',
		precision: 10,
		includePaths: ['.']
	}).on('error', gp.sass.logError))
	.pipe(gulp.dest('source/public/styles'));
})

gulp.task('css', function() {
	return gulp.src('source/public/styles/*.css')
		.pipe(gp.plumber())
		.pipe(gp.concat('main.css'))
		.pipe(gp.sourcemaps.init())
		.pipe(gp.autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}))
		.pipe(gp.cssnano())
		.pipe(gp.sourcemaps.write('.'))
		.pipe(gp.size({title: 'Production', showFiles: true, gzip: true}))
		.pipe(gulp.dest('app/public/styles'));
})

// @JavaScript parsers / helpers (ES2015 issues compiling)

gulp.task('jscompile', function() {
	var code =  gulp.src('source/public/scripts/**/*.js')
		.pipe(babel())
		.pipe(gp.jshint())
		.pipe(gp.size())
		.pipe(gulp.dest('.temp'));
	return code;
})

gulp.task('clientjs', ['jscompile'], function() {
	var bundled = browserify({ basedir : '.temp'});
	var code = bundled.add('./main.js')
		.bundle()
		.on('error', function(err) { console.error(err); this.emit('end'); })
		.pipe(source('build.js'))
		.pipe(buffer())
		.pipe(gp.jshint())
		.pipe(gp.sourcemaps.init({loadMaps: true}))
		//.pipe(gp.uglify())
		.pipe(gp.sourcemaps.write('.'))
		.pipe(gp.size({title: 'Production', showFiles: true, gzip: true}))
		.pipe(gulp.dest('app/public/scripts/'));
	return code;
})

gulp.task('serverjs', function(){
	var code =  gulp.src('source/server/**/*.js')
		.pipe(babel())
		.pipe(gp.jshint())
		.pipe(gp.size())
		.pipe(gulp.dest('app/server'));
	return code;
});

gulp.task('app', function(){
	var code =  gulp.src('source/app.js')
		.pipe(babel())
		.pipe(gp.jshint())
		.pipe(gp.size())
		.pipe(gulp.dest('app'));
	return code;
});

// @Images && fonts && extras adding tasks

gulp.task('img', function() {
  return gulp.src('source/public/images/**/*.*')
    .pipe(gp.if(gp.if.isFile, gp.cache(gp.imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [{cleanupIDs: false}]
    }))
    .on('error', function (err) {
      console.log(err);
      this.end();
    })))
    .pipe(gulp.dest('app/public/images'));
});

gulp.task('hooks', ['styling', 'fonts'], function() {
  return gulp.src('bower_components/**/*.min.js')
		.pipe(flatten())
		.pipe(gulp.dest('app/public/scripts/vendors'));
});
gulp.task('styling', function() {
  return gulp.src('bower_components/**/*.min.css')
		.pipe(flatten())
		.pipe(gulp.dest('app/public/styles/vendors'));
});
gulp.task('fonts', function() {
  return gulp.src('bower_components/**/*.{eot,svg,ttf,woff,woff2}')
		.pipe(flatten())
		.pipe(gulp.dest('source/public/fonts'));
});

gulp.task('fnt', function() {
  return gulp.src('source/public/fonts/**/*')
	//.pipe(gp.concat('allfonts'))
	.pipe(gulp.dest('app/public/fonts'));
});

gulp.task('extras', function() {
  return gulp.src([
    'source/public/extras/*.*',
    'source/public/*.*',
    'source/*.*',
    '!source/*.html',
    '!source/*.txt',
    '!source/*.js'
  ], {
    dot: true
  }).pipe(gulp.dest('app/public/extras'));
});

// @Helpers && first time hooks

// @@Bower components injection
gulp.task('wiredep', function() {
  gulp.src('source/public/styles/*.scss')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest('source/public/styles'));

  gulp.src('source/public/views/*.html')
    .pipe(wiredep({
      exclude: ['bootstrap-sass'],
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('source/public/views'));
});

gulp.task('first', ['clean', 'hooks', 'extras', 'fnt', 'img', 'clientjs', 'css', 'html'], function() {
	console.warn('Initial work done.\nPlease use "gulp serve" to run project');
});

gulp.task('clean', del.bind(null, ['.temp/*', 'app/public/*']));

// @End of gulpfile
