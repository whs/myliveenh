import $ from 'jquery';
import topcoat from 'topcoat/css/topcoat-desktop-dark.min.css';
import Settings from 'settings';
import Database from 'emotepack/database';

const loader = require.context('../', true, /package\.json$/);
const EMOTE_WORKER = '/emotepack/emoteloader.js';

class SettingsPage{
	options = new Map();

	constructor(target, emotesTarget){
		this.target = $(target);
		this.emotesTarget = $(emotesTarget);
		this.renderOptions();
		this.renderEmotes();
		this.loadSettings();
		let self = this;

		$('<div class="save"><button class="topcoat-button--large--cta">Save</button></div>')
			.appendTo(this.target)
			.find('button')
			.click(async function(){
				await self.save();
				$('<div class="saved">กำลังโหลดการตั้งค่าใหม่</div>').appendTo(self.target);
				alert('รีโหลดแท็บ mylive เพื่อใช้การตั้งค่าใหม่');

				setTimeout(() => {
					chrome.runtime.reload();
				}, 500);
			});
	}

	renderOptions(){
		let categories = new Map();
		categories.set('', []);

		for(let module of loader.keys()){
			let metadata = loader(module);
			let category = metadata.category || '';
			if(!categories.has(category)){
				categories.set(category, []);
			}

			if(metadata.settings){
				for(let key of Object.keys(metadata.settings)){
					let value = metadata.settings[key];
					let row = this.createInput(value);
					categories.get(category).push(row);
					this.options.set(key, row.find('input'));
				}
			}

			if(!metadata.no_disable){
				let row = this.createCheckbox(metadata.description || metadata.name);
				categories.get(category).push(row);
				this.options.set(metadata.name, row.find('input'));
			}
		}

		for(let [name, value] of categories){
			$('<h3 />').text(name).appendTo(this.target);
			let target = $('<div />');

			for(let item of value){
				item.appendTo(target);
			}

			target.appendTo(this.target);
		}
	}

	createCheckbox(name){
		let row = $('<div />');
		let label = $('<label class="topcoat-switch" />');
		label.prepend('<div class="topcoat-switch__toggle" />');
		let checkbox = $('<input type="checkbox" class="topcoat-switch__input" />')
			.prependTo(label);
		label.appendTo(row);
		$('<span class="label" />').text(name).appendTo(row);

		return row;
	}

	createInput(props){
		if(props.type == 'boolean'){
			return this.createCheckbox(props.label);
		}

		let row = $('<div />');
		let label = $('<label />');
		$('<span class="label" />')
			.text(props.label)
			.appendTo(label);
		let input = $('<input />')
			.addClass('topcoat-text-input')
			.attr('type', props.type)
			.prependTo(label);

		const validProps = ['min', 'max', 'pattern'];
		for(var prop of validProps){
			if(props[prop] !== undefined){
				input.attr(prop, props[prop]);
			}
		}

		label.appendTo(row);
		$('<span class="label" />').text(name).appendTo(row);

		return row;
	}

	async loadSettings(){
		let settings = await Settings.get();
		for(let key of Object.keys(settings)){
			let field = this.options.get(key);
			if(field){
				// regenerator fail to compile if(!field) continue
				if(field.attr('type') === 'checkbox'){
					field.attr('checked', settings[key]);
				}else{
					field.val(settings[key]);
				}
			}
		}
	}

	async save(){
		let settings = await Settings.get();
		for(let [key, field] of this.options){
			if(field.attr('type') == 'checkbox'){
				settings[key] = field.prop('checked');
			}else{
				settings[key] = field.val();
				if(field.attr('type') == 'number'){
					settings[key] = parseInt(settings[key], 10);
				}
			}
		}
		return Settings.set(settings);
	}

	renderEmotes(){
		let emote = $(`
<div class="emotepick">
	<button class="topcoat-button--large">Load emotes pack</button>
	<input type="file" type="application/zip" />
</div>
`)
			.on('change', (e) => {
				if(e.target.files.length === 0){
					return;
				}

				let file = e.target.files[0];
				let worker = new Worker(EMOTE_WORKER);
				worker.onmessage = (msg) => {
					if(msg.data){
						alert(msg.data);
					}
					worker.terminate();
					this.refreshEmote();
				};
				worker.postMessage(file);
			})
			.appendTo(this.emotesTarget);

		this.emoteList = $('<div id="emotelist" />')
			.appendTo(this.emotesTarget);
		this.refreshEmote();
	}

	async refreshEmote(){
		this.emoteList.empty();

		let database = await Database();
		let tx = database.transaction(['emotes', 'emotesFile']);

		let request = tx.objectStore('emotes').getAll();
		request.onsuccess = (e) => {
			let list = e.target.result;
			for(let item of list){
				let head = $('<div class="list-head" />')
					.text(item.name)
					.appendTo(this.emoteList);

				$('<button class="topcoat-button">Remove</button>')
					// TODO
					.appendTo(head);

				for(let emote in item.emotes){
					let row = $('<div class="emote" />')
						.appendTo(this.emoteList);

					$('<div class="text" />')
						.text(emote)
						.appendTo(row);

					let request = tx.objectStore('emotesFile')
						.get(item.emotes[emote]);
					request.onsuccess = (e) => {
						let url = window.URL.createObjectURL(e.target.result);
						$('<img />').attr('src', url).prependTo(row);
					};
				}
			}
		};
	}
}

export default new SettingsPage($('#target'), $('#emotes'));
