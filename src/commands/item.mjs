import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { findItemName } from '../modules/nameFinders.mjs';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

export const information = {
	name: 'item',
	description: 'Queries Item info from the LoL wiki',
};

export default {
	data: new SlashCommandBuilder()
		.setName(`${information.name}`)
		.setDescription(`${information.description}`)
		.addStringOption((option) =>
			option
				.setName('item')
				.setDescription("Item's Name")
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const item = interaction.options.getString('item');
		const itemId = await findItemName(item, interaction);
		const embed = new EmbedBuilder();

		const request = await fetch(
			`https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/items/${itemId}.json`,
		).catch((err) => {
			interaction.editReply('Please choose a valid item name');
			return;
		});

		const body = await request.text();

		let bodyJSON;
		try {
			bodyJSON = JSON.parse(body);
		} catch (error) {
			console.log(error);
			interaction.editReply('**Please choose a valid Item name**');
			return;
		}

		embed.setTitle(bodyJSON.name).setThumbnail(bodyJSON.icon);

		for (const stat in bodyJSON.stats) {
			for (const type in bodyJSON.stats[stat]) {
				if (bodyJSON.stats[stat][type] !== 0.0) {
					embed.addFields({
						name: `${type} ${stat}`,
						value: `${bodyJSON.stats[stat][type]}`,
						inline: true,
					});
				}
			}
		}

		for (const passive in bodyJSON.passives) {
			let passiveName;
			if (bodyJSON.passives[passive].name) {
				passiveName = bodyJSON.passives[passive].name;
			} else {
				passiveName = '';
			}
			let passiveEffects;
			if (bodyJSON.passives[passive].effects != null) {
				passiveEffects = bodyJSON.passives[passive].effects.replace(
					/\+/g,
					'%2b',
				);
				const passiveUrl = `https://leagueoflegends.fandom.com/api.php?action=parse&text=${passiveEffects}&contentmodel=wikitext&format=json`;
				const passiveRequest = await fetch(passiveUrl).catch((err) => {
					console.log(err);
				});
				const passiveBody = await passiveRequest.text();
				let passivebodyJSON;
				try {
					passivebodyJSON = JSON.parse(passiveBody);
				} catch (error) {
					interaction.editReply('**Error parseing passive**');
					return;
				}

				const passivedom = new JSDOM(passivebodyJSON.parse.text['*'], {
					contentType: 'text/html',
				});

				let passiveDocument = passivedom.window.document;
				passiveEffects = passiveDocument.querySelector('p').textContent;
			}
			let passiveCooldown;
			if (bodyJSON.passives[passive].cooldown != null) {
				passiveCooldown = bodyJSON.passives[passive].cooldown;
				const passiveUrl = `https://leagueoflegends.fandom.com/api.php?action=parse&text=${passiveCooldown}&contentmodel=wikitext&format=json`;
				const passiveRequest = await fetch(passiveUrl).catch((err) => {
					console.log(err);
				});
				const passiveBody = await passiveRequest.text();
				let passivebodyJSON;
				try {
					passivebodyJSON = JSON.parse(passiveBody);
				} catch (error) {
					interaction.editReply('**Error parseing passive**');
					return;
				}

				const passivedom = new JSDOM(passivebodyJSON.parse.text['*'], {
					contentType: 'text/html',
				});

				let passiveDocument = passivedom.window.document;
				passiveCooldown = `(${passiveDocument
					.querySelector('p')
					.textContent.trim()} second cooldown)`;
			} else {
				passiveCooldown = '';
			}

			if (bodyJSON.passives[passive].mythic == true) {
				embed.addFields({
					name: `Mythic Passive: `,
					value: `Embues each of your legendary items with:`,
				});
				for (const stat in bodyJSON.passives[passive].stats) {
					for (const type in bodyJSON.passives[passive].stats[stat]) {
						if (
							bodyJSON.passives[passive].stats[stat][type] !== 0.0
						) {
							embed.addFields({
								name: `${type} ${stat}`,
								value: `${bodyJSON.passives[passive].stats[stat][type]}`,
								inline: true,
							});
						}
					}
				}
			} else if (bodyJSON.passives[passive].unique == true) {
				embed.addFields({
					name: `Unique Passive: ${passiveName}`,
					value: `${passiveEffects} ${passiveCooldown}`,
				});
			} else if (bodyJSON.passives[passive].unique == false) {
				embed.addFields({
					name: `Passive: ${passiveName}`,
					value: `${passiveEffects} ${passiveCooldown}`,
				});
			}
		}

		await interaction.editReply({ embeds: [embed] });
	},
};