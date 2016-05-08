import $ from 'jquery';
import streamInfo from 'core/streaminfo';
import injectScript from 'core/injectscript';
import plugin from 'core/plugin';
import Settings from 'settings';

let ID = 0;

plugin('hoverpreview', async function(){
	let settings = await Settings.get();

	$('#mainpagebody')
		.on('mouseenter', '.thumb', function(){
			let item = $(this);
			let node = this;
			let streamUrl = item.find('.roomtitle a').attr('href');
			let streamId = streamUrl.match(/([0-9]+)$/)[0];

			clearTimeout(this.__enh_hoverpreview_timer);
			delete this.__enh_hoverpreview_canceled;
			this.__enh_hoverpreview_timer = setTimeout(async function(){
				let coverImage = item.find('.cover img');
				let width = coverImage.width(), height = coverImage.height();
				coverImage.hide();

				let stream = await streamInfo(streamId);
				if(this.__enh_hoverpreview_canceled){
					return;
				}

				let id = `enh__hoverpreview_${ID++}`;
				node.__enh_hoverpreview_id = id;
				node.__enh_hoverpreview_target = $('<div />')
					.attr('id', id)
					.appendTo(item.find('.cover'));

				let settings = {
						file: stream.rtmp,
						image: coverImage.attr('src'),
						width: width,
						height: height,
						autostart: true,
						controls: false,
						rtmp: {
							bufferlength: 2
						}
				};

				injectScript(`(function(){
var playerInstance = jwplayer(${JSON.stringify(id)});
playerInstance.setup(${JSON.stringify(settings)});
playerInstance.on('displayClick', function(){
	window.location = ${JSON.stringify(streamUrl)};
});
})();`);
			}, settings.previewDelay * 1000);
		})
		.on('mouseleave', '.thumb', function(){
			let item = $(this);
			clearTimeout(this.__enh_hoverpreview_timer);
			item.find('.cover img').show();
			this.__enh_hoverpreview_canceled = true;

			if(this.__enh_hoverpreview_id){
				injectScript(`
jwplayer(${JSON.stringify(this.__enh_hoverpreview_id)}).remove();
document.getElementById(${JSON.stringify(this.__enh_hoverpreview_id)}).remove();
`);
				delete this.__enh_hoverpreview_id;
			}
		});
});