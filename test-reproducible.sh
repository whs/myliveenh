#!/bin/bash
set -e

echo
echo Testing reproducible build
echo

clean(){
	rm -r build || true
	rm -r release-*.zip || true
}
hash(){
	find build -name \*.js -execdir shasum -a 512 \{\} +
}

echo Running first build
clean
gulp release
hash > /tmp/myliveenh-expected

echo Expected hash
cat /tmp/myliveenh-expected

SOURCEPATH=`pwd`

echo
echo Reproducing from packed source...
echo

rm -r /tmp/myliveenh-test || true
mkdir /tmp/myliveenh-test
cd /tmp/myliveenh-test

echo Unpacking source
unzip $SOURCEPATH/source.zip
cd myliveenh
echo Installing dependencies
npm install
gulp release
hash > /tmp/mylivenh-actual

if [ `cat /tmp/myliveenh-expected` != `cat /tmp/mylivenh-actual` ]; then
	diff /tmp/myliveenh-expected /tmp/mylivenh-actual
	echo Test failed
	exit 1
fi

echo
echo Test passed
