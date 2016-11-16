require('babel-core/register');

const gulp = require('gulp'),
      babel = require('gulp-babel'),
      mocha = require('gulp-mocha');

gulp.task('test', () =>
    gulp.src('./tests/**/*.tests.js', {read: false})
        .pipe(mocha())
);

gulp.task('build', () =>
    gulp.src('src/**/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('lib'))
);

gulp.task('default', ['build', 'test']);

