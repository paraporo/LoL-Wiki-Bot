import fetch from 'node-fetch';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} from 'discord.js';

//Define the handler
export default class handler {
	constructor() {}

	wikiFormat(element) {
		const icons = element.querySelectorAll('img');

		icons.forEach((icon) => {
			switch (icon.getAttribute('data-image-name')) {
				case 'Hybrid resistances icon.png':
					icon.parentElement.innerHTML =
						'<:Hybrid_resistances:1049644163680981022>';
					break;
				case 'Gold.png':
					icon.parentElement.innerHTML =
						'<:Gold:1049630454266998804>';
					break;
				case 'Ranged role.png':
					icon.parentElement.innerHTML =
						'<:Ranged:1049627230776602655>';
					break;
				case 'Melee role.png':
					icon.parentElement.innerHTML =
						'<:Melee:1049626581271851008>';
					break;
				case 'Slow icon.png':
					icon.parentElement.innerHTML =
						'<:Slow:1049627228239040532>';
					break;
				case 'Champion icon.png':
					icon.parentElement.innerHTML =
						'<:Champion:1049627894101577748>';
					break;
				case 'Stun icon.png':
					icon.parentElement.innerHTML = '<:CC:1049627891673071677>';
					break;
				case 'Movement speed icon.png':
					icon.parentElement.innerHTML =
						'<:Movement_speed:1049626078236397568>';
					break;
				case 'Heal power icon.png':
					icon.parentElement.innerHTML =
						'<:Heal:1049623247383183400>';
					break;
			}
		});

		for (const node of element.querySelectorAll('b')) {
			if (node.textContent) node.innerHTML = `​**​${node.innerHTML}​**​`;
		}
		for (const node of element.querySelectorAll('a')) {
			if (
				node.parentElement.nodeName !== 'B' &&
				node.textContent &&
				!node.textContent.match(/:.+:/g)
			)
				node.textContent = `​**​${node.textContent}​**​`;
		}
		for (const node of element.querySelectorAll('.template_sbc')) {
			if (
				node.childElementCount === 1 &&
				node.children[0].nodeName === 'B'
			)
				node.innerHTML = `​*​${node.innerHTML.toUpperCase()}​*​`;
			else if (node.textContent)
				node.innerHTML = `​_​${node.innerHTML.toUpperCase()}​_​`;
		}
		for (const node of element.querySelectorAll('ul')) {
			if (node.textContent) node.textContent = node.textContent + '\n';
		}
		for (const node of element.querySelectorAll('ol')) {
			if (node.textContent) node.textContent = node.textContent + '\n';
		}
		for (const node of element.querySelectorAll('li')) {
			if (node.textContent) node.textContent = '\n• ' + node.textContent;
		}

		return element;
	}

	wikiLinkify(element) {
		const links = element.querySelectorAll('a');
		links.forEach((link) => {
			if (link.textContent && !link.textContent.match(/:.+:/g))
				link.textContent = `[${link.textContent}](https://leagueoflegends.fandom.com${link.href})`;
		});

		return element;
	}

	//Special handler for aphelios weapon system
	async apheliosHandler(abilityLetter, interaction) {
		//Prevent discord from ending the interaction
		await interaction.deferReply();

		let document, aphAbilities;
		let myEmbeds = [];
		let buttons = [];

		let abilityProperties = [
			'cast time',
			'target range',
			'range',
			'cost',
			'cooldown',
			'speed',
			'effect radius',
			'width',
		];

		//Emojis for weapons and 'props'
		let emojis = [
			'<:Aphelios_The_Hitman_and_the_Seer:1012902419081986048>',
			'<:Aphelios_Weapons_of_the_Faithful:1012902419925061663>',
			'<:Aphelios_Calibrum:1012902406863982592>',
			'<:Aphelios_Moonshot:1012902414757670952>',
			'<:Aphelios_Severum:1012902417987272836>',
			'<:Aphelios_Onslaught:1012902415852380311>',
			'<:Aphelios_Gravitum:1012902412782153769>',
			'<:Aphelios_Binding_Eclipse:1012902404364185660>',
			'<:Aphelios_Infernum:1012902413298040843>',
			'<:Aphelios_Duskwave:1012902410399781015>',
			'<:Aphelios_Crescendum:1012902408311013408>',
			'<:Aphelios_Sentry:1012902416942891119>',
		];

		if (abilityLetter == 'I') {
			aphAbilities = [0, 2, 4, 6, 8, 10];
		} else {
			aphAbilities = [1, 3, 5, 7, 9, 11];
		}

		const url = `https://leagueoflegends.fandom.com/wiki/Aphelios/LoL`;
		const request = await fetch(url).catch((err) => {
			console.log(err);
		});

		const body = await request.text();

		const dom = new JSDOM(body, {
			contentType: 'text/html',
		});

		document = dom.window.document;

		for (let i = 0; i < aphAbilities.length; i++) {
			let aphAbility = aphAbilities[i];

			let ability = document.getElementsByClassName(
				'ability-info-container',
			)[aphAbility];

			const embed = new EmbedBuilder();

			let abilityHeader =
				ability.getElementsByClassName('mw-headline')[0].textContent;

			embed.setTitle(`**${abilityHeader}**`);

			let abilityStats = ability.getElementsByTagName('aside')[0];

			if (abilityStats) {
				for (let i = 0; i < abilityProperties.length; i++) {
					const element = abilityStats.querySelector(
						`div[data-source="${abilityProperties[i]}"]`,
					);

					if (element) {
						const elementText = element.textContent.split(':');

						embed.addFields({
							name: `${elementText[0].trim()}`,
							value: `${elementText[1].trim()}`,
							inline: true,
						});
					}
				}
			}

			//grabs the array of tables in the ability
			let abilityTables = ability.getElementsByTagName('table');

			//process the tables in the array and create fields for each subtable
			for (let i = 0; i < abilityTables.length; i++) {
				const table = abilityTables[i];

				const subTables = table.getElementsByTagName('dl');

				for (let i = 0; i < subTables.length; i++) {
					const subTable = subTables[i];
					const subTableHeaders = subTable.getElementsByTagName('dt');
					const subTableData = subTable.getElementsByTagName('dd');

					for (let i = 0; i < subTableHeaders.length; i++) {
						const header = subTableHeaders[i].textContent;
						const data = subTableData[i].textContent;

						embed.addFields({
							name: `${header.trim()}`,
							value: `${data.trim()}`,
							inline: true,
						});
					}
				}
			}

			let abilityDetails = ability.querySelectorAll('p, ul');
			let detailText = '';

			for (let i = 0; i < abilityDetails.length; i++) {
				const detail = abilityDetails[i];
				detailText = detail.textContent;

				if (detailText) {
					embed.addFields({
						name: `​`,
						value: `${detailText}`,
					});
				}
			}

			let abilityImage = ability
				.getElementsByTagName('img')[0]
				.getAttribute('src');

			embed.setThumbnail(abilityImage);
			myEmbeds.push(embed);

			buttons.push(
				new ButtonBuilder()
					.setCustomId(i.toString())
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(emojis[aphAbility]),
			);
		}

		return {
			embeds: myEmbeds,
			buttons: buttons,
		};
	}
}
