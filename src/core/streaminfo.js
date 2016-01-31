export default async function(id){
	let body = await fetch(`http://mylive.in.th/streams/${id}`, {
		credentials: 'include'
	}).then((res) => res.text());

	let html = document.createElement('html');
	html.innerHTML = body;

	let rtmp, hls, poster;
	try{
		rtmp = body.match(/(rtmp:\/\/[^"]+)/i)[0];
	}catch(e){}
	try{
		hls = body.match(/(http:\/\/stream[^"]+\.m3u8)/i)[0];
	}catch(e){}
	try{
		hls = body.match(/image: "([^"]+)"/i)[1];
	}catch(e){}

	return {
		rtmp: rtmp,
		hls: hls,
		poster: poster,
		avatar: html.getElementsByClassName('owner')[0].getAttribute('src'),
	};
}
