import { renderRss2 } from '../../utils/util';
import { substr } from 'runes2';

let deal = async (ctx) => {
	const { username } = ctx.req.param();
	let res = await fetch(`https://t.me/s/${username}`);
	// let res = await fetch(`http://127.0.0.1:3100/admin/to?t=https://t.me/s/${username}&x=0`);

	// let result = await res.json();
	// res = result.order10Back
	
	let title = '';
	let link = `https://t.me/s/${username}`;
	let description = '';
	let language = 'zh-cn';
	let tgme_widget_message_texts = [];
	let tgme_widget_message_dates = [];
	let src_links = [];
	let last_tag = '';
	let new_res = new HTMLRewriter()
		.on('head > title', {
			text(text) {
				title += text.text;
			},
		})
		.on('head > meta[property="og:description"]', {
			element(element) {
				description += element.getAttribute('content');
			},
		})
		.on('.tgme_widget_message_bubble', {
			element(element) {
				tgme_widget_message_texts.push('');
			},
		})
		.on('.tgme_widget_message_bubble > .tgme_widget_message_text', {
			text(text) {
				tgme_widget_message_texts[tgme_widget_message_texts.length - 1] += text.text;
			},
		})
		.on('.tgme_widget_message_bubble > .tgme_widget_message_text > a', {
			element(element) {
				let link = element.getAttribute('href')
				console.log(link);
				const match_wx = link.match(/^(https?:\/\/mp\.weixin\.qq\.com\/s)/);
				if (match_wx) {
					tgme_widget_message_texts[tgme_widget_message_texts.length - 1] += `<br> <a href="${link}">微信</a><br>`;
				}
				// https://telegra.ph
				const match_telegra = link.match(/^https?:\/\/telegra\.ph\/.+/);
				if (match_telegra) {
					tgme_widget_message_texts[tgme_widget_message_texts.length - 1] += `<br> <a href="${link}">Telegra</a><br>`;
				}
				// https://daily.zhihu.com
				const match_zhihu = link.match(/^https?:\/\/daily\.zhihu\.com\/story\/\d+/);
				if (match_zhihu) {
					tgme_widget_message_texts[tgme_widget_message_texts.length - 1] += `<br> <a href="${link}">知乎日报</a><br>`;
				}

			},
		})
		.on('.tgme_widget_message_bubble .tgme_widget_message_photo_wrap', {
			element(element) {
				let style = element.getAttribute('style');
				let url = style.match(/background-image:url\('(.+)'\)/)[1];
				tgme_widget_message_texts[tgme_widget_message_texts.length - 1] += '<img src="' + url + '" />';
				tgme_widget_message_texts[tgme_widget_message_texts.length - 1] += '<br>';
			},
		})
		.on('.tgme_widget_message_bubble > .tgme_widget_message_text > b', {
			element(element) {
				// add <b> tag
				tgme_widget_message_texts[tgme_widget_message_texts.length - 1] += '<b>';
			},
			text(text) {
				if (text.lastInTextNode) {
					tgme_widget_message_texts[tgme_widget_message_texts.length - 1] += '</b>';
				}
			},
		})
		.on('.tgme_widget_message_bubble > .tgme_widget_message_text > br', {
			element(element) {
				// add <br> tag
				tgme_widget_message_texts[tgme_widget_message_texts.length - 1] += '<br>';
			},
		})
		.on('.tgme_widget_message_date > time', {
			element(element) {
				tgme_widget_message_dates.push(element.getAttribute('datetime'));
			},
		})
		.on('.tgme_widget_message_wrap > .tgme_widget_message', {
			element(element) {
				let data_post = element.getAttribute('data-post');
				src_links.push(`https://t.me/${username}/${data_post}`);
			},
		})
		// .transform(new Response(res)); // 确保传入 Response 对象
		.transform(res); // 确保传入 Response 对象

	// 使用 .text() 获取转换后的 HTML
	await new_res.text();
	let items = [];
	src_links = src_links.reverse();
	tgme_widget_message_dates = tgme_widget_message_dates.reverse();
	for (let i = 0; i < tgme_widget_message_texts.length; i++) {
		if (tgme_widget_message_texts[i] === '') {
			continue;
		}
		let title = tgme_widget_message_texts[i].replace(/<br>/g, ' ');
		title = title.replace(/<b>|<\/b>|<img.*?>|<a.*?>|<\/a>/g, '');
		title = title.replace("原文", '');
		title = title.replace("微信原文", '');
		title = title.replace("知乎日报", '');
		title = title.replace("链接", '');
		title = title.replace("频道大全", '');
		title = title.replace("Telegra", '');
		title = title.replace("Telegraph", ''); 
		title = title.replace("|", '');
		title = title.trim()
		if (title.length > 100) {
			title = substr(title, 0, 100) + '...';
		} else if (title.trim().length === 0) {
			title = '无标题';
		}
		let item = {
			title: title,
			link: src_links.pop(),
			description: tgme_widget_message_texts[i],
			pubDate: tgme_widget_message_dates.pop(),
		};
		items.push(item);
	}
	items = items.reverse();
	let data = {
		title: title,
		link: link,
		description: description,
		language: language,
		items: items,
	};
	ctx.header('Content-Type', 'application/xml');
	return ctx.body(renderRss2(data));
};

let setup = (route) => {
	route.get('/telegram/channel/:username', deal);
};

export default { setup };
