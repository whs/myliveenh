import path from 'path';

import gulp from 'gulp';
import webpackModule from 'webpack';
import webpack from 'webpack-stream';
import file from 'gulp-file';
import named from 'vinyl-named';
import rename from 'gulp-rename';
import postcss from 'gulp-postcss';

import chromeGenerator from './tools/chrome-manifest';
import getBackgroundScripts from './tools/get-background';
import getContentScripts from './tools/get-content-script';

const dest = 'build';
const postcssConfig = () => {
	return [
	];
};
const webpackConfig = {
	module: {
		loaders: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'babel',
			}
		]
	},
	resolve: {
		root: [
			path.resolve(path.join(__dirname, 'src'))
		]
	},
	plugins: [],
	postcss: postcssConfig
};

gulp.task('default', ['generate-chrome-manifest', 'copy', 'copy-modules', 'build']);
gulp.task('build', ['build-background', 'build-css', 'build-content-script', 'build-stop-angular']);

gulp.task('generate-chrome-manifest', async function(){
	return file(
		'manifest.json',
		JSON.stringify(await chromeGenerator(), null, '\t'),
		{src: true}
	).pipe(gulp.dest(dest));
});

gulp.task('generate-background', (cb) => {
	getBackgroundScripts().then((backgrounds) => {
		return backgrounds.map(item => {
			item = path.join('..', item);
			return `import ${path.basename(item).replace(/\.js/, '')} from ${JSON.stringify(item)};`;
		}).join('\n');
	}).then((script) => {
		// seems gulp does not understand a promise that return a stream
		return file(
			'background.js',
			script,
			{src: true}
		)
			.pipe(gulp.dest(dest))
			.on('end', cb);
	});
});
gulp.task('build-background', ['generate-background'], () => {
	let config = Object.assign({}, webpackConfig);
	config.output = {
		filename: 'background.js'
	};

	return gulp.src(path.join(dest, 'background.js'))
		.pipe(webpack(config))
		.pipe(gulp.dest(dest));
});

gulp.task('build-css', () => {
	return gulp.src([
		'src/**/*.scss',
	], {base: './src/'})
		.pipe(postcss(postcssConfig()))
		.pipe(rename((file) => {
			file.extname = '.css';
			return file;
		}))
		.pipe(gulp.dest(dest));
});

gulp.task('build-content-script', (cb) => {
	let config = Object.assign({}, webpackConfig);
	config.watch = true;
	config.plugins = config.plugins.slice(0); // clone
	config.plugins.push(new webpackModule.optimize.CommonsChunkPlugin({
		name: 'commons',
		minChunks: 4,
	}));

	getContentScripts().then((scripts) => {
		return gulp.src(Array.from(scripts.values()));
	}).then((source) => {
		let srcRoot = path.join(__dirname, 'src');

		return source.pipe(named((file) => {
			return path.relative(srcRoot, file.path).replace(/\.js$/, '');
		}))
			.pipe(webpack(config))
			.pipe(gulp.dest(dest))
			.on('end', cb);
	});
});

gulp.task('build-stop-angular', () => {
	return gulp.src('src/core/stop_angular.js')
		.pipe(named())
		.pipe(webpack(webpackConfig))
		.pipe(gulp.dest(dest));
});

gulp.task('copy', () => {
	return gulp.src([
		'data/**/*',
	], {base: './'})
		.pipe(gulp.dest(dest));
});

gulp.task('copy-modules', () => {
	return gulp.src([
		'src/**/*',
		'!src/**/*.js',
		'!src/**/*.scss',
		'!src/**/package.json'
	], {base: './src/'})
		.pipe(gulp.dest(dest));
});

gulp.task('watch', () => {
	gulp.watch([
		'src/**/*.js',
		'src/**/*.scss',
	], ['build']);
	gulp.watch([
		'src/**/*',
		'!src/**/*.js',
		'!src/**/*.scss',
	], ['copy-modules']);
});
