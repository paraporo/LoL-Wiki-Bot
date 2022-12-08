import {
	ActionRowBuilder,
	SlashCommandBuilder,
	EmbedBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { JSDOM } from 'jsdom';
import { findRune } from '../modules/nameFinders.mjs';
import handlers from '../modules/handlers.mjs';

export const informaton = {
    name: 'rune',
    description: 'Gets the information for a rune / rune tree from the wiki'
};

const globals = {
    color: {
        error: 0xF7A4A4,
        notfound: 0xFEBE8C,
        success: 0xB6E2A1
    },
    treeIcons: {
        Precision: '<:Precision:1049646550462242866>',
        Resolve: '<:Resolve:1049646547131969536>',
        Domination: '<:Domination:1049646548868407316>',
        Sorcery: '<:Sorcery:1049646552131575848>',
        Inspiration: '<:Inspiration:1049646545127096371>'
    },
    treeDescriptions: {
        precision: 'Improved attacks and sustained damage.',
        domination: 'Burst damage and target access.',
        sorcery: 'Empowered abilities and resource manipulation.',
        inspiration: 'Creative tools and rule bending.',
        resolve: 'Durability and crowd control.'
    }
};

async function handlError(interaction, error) {
    console.error(`Error: ${error}`);
    let embed = new EmbedBuilder();
    let rtnEmbeds = [];
    embed.setTitle('**Error getting rune or rune tree**');
    embed.setColor(globals.color.error);
    rtnEmbeds.push(embed);
    if (interaction.replied || interaction.deferred)
        await interaction.editReply({embeds: rtnEmbeds});
    else
        await interaction.reply({embeds: rtnEmbeds});
}

async function handleNotFound(interaction) {
    let embed = new EmbedBuilder();
    let rtnEmbeds = [];
    embed.setTitle('**Rune or rune tree not found**');
    embed.setColor(globals.color.notfound);
    rtnEmbeds.push(embed);
    if (interaction.replied || interaction.deferred)
        await interaction.editReply({embeds: rtnEmbeds});
    else
        await interaction.reply({embeds: rtnEmbeds});
}

async function domFromUrl(url) {
    try {
        const body = await fetch(url).then(async res => await res.json()).catch(err => {throw err});
        let dom = new JSDOM(body.parse.text['*'], {contentType: 'text/html'});
        return dom.window.document;
    } catch (error) {
        return undefined;
    }
}

async function handleRune(interaction, rune) {
    try {
        const url = `https://leagueoflegends.fandom.com/api.php?action=parse&text={{rune%20header|${rune.name}}}&contentmodel=wikitext&format=json`;
        const document = await domFromUrl(url);

        let rtnEmbeds = [];
        let embed = new EmbedBuilder();

        if(document.getElementsByClassName('pi-item pi-data pi-item-spacing pi-border-color')[0] === undefined) {
            await handlError(interaction, 1);
            return;
        }

        embed.setTitle(`**${globals.treeIcons[rune.tree.name]} ${rune.name}**`);
        embed.setColor(globals.color.success);
        embed.setThumbnail(`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`);
        
        let haveFields = false;
        let index = 0;
        
        let description = '​';
        while ( document.getElementsByClassName('pi-item pi-data pi-item-spacing pi-border-color')[index + 1] !== undefined) {
            if (document.getElementsByClassName('pi-item pi-data pi-item-spacing pi-border-color')[index].childElementCount === 2) {
                embed.addFields({name: document.getElementsByClassName('pi-item pi-data pi-item-spacing pi-border-color')[index].children[0].textContent, value: document.getElementsByClassName('pi-item pi-data pi-item-spacing pi-border-color')[index].children[1].textContent});
                haveFields = true;
            }
            else {
                new handlers().wikiFormat(document.getElementsByClassName('pi-item pi-data pi-item-spacing pi-border-color')[index]);
                const content = new handlers().wikiLinkify(document.getElementsByClassName('pi-item pi-data pi-item-spacing pi-border-color')[index]).textContent.trim();
                
                description += '\n' + content + '\n';
            }
            index++;
        }

        if (haveFields)
            description += '​';

        embed.setDescription(description);
        rtnEmbeds.push(embed);
        interaction.editReply({embeds: rtnEmbeds});
    } catch (error) {
        handlError(interaction, error);
        return;
    }
}

async function handleTree(interaction, channel, tree) {   
    try {             
        const url = `https://leagueoflegends.fandom.com/api.php?action=parse&text={{Rune%20path%20infobox/${tree.name}}}&contentmodel=wikitext&format=json`;
        const document = await domFromUrl(url);

        let rtnEmbeds = [];
        let embed = new EmbedBuilder();
        embed.setTitle(`**${tree.name}**`);
        embed.setColor(globals.color.success);
        embed.setThumbnail(`https://ddragon.leagueoflegends.com/cdn/img/${tree.icon}`);
        embed.setDescription(`_${globals.treeDescriptions[tree.name.toLowerCase()] || ''}_`)

        const slots = new ActionRowBuilder();
        let index = 0;
        while (document.getElementsByClassName('pi-item pi-header pi-secondary-font pi-item-spacing pi-secondary-background')[index] !== undefined && document.getElementsByClassName(`pi-smart-group-body pi-border-color`)[index] !== undefined && document.getElementsByClassName(`pi-smart-group-body pi-border-color`)[index].textContent.trim()) {
            embed.addFields({name: document.getElementsByClassName('pi-item pi-header pi-secondary-font pi-item-spacing pi-secondary-background')[index].textContent.includes('Keystone') ? 'Keystone' : document.getElementsByClassName('pi-item pi-header pi-secondary-font pi-item-spacing pi-secondary-background')[index].textContent, value: document.getElementsByClassName(`pi-smart-group-body pi-border-color`)[index].textContent.trim().replace(/\n/g, ' ').replace(/ {2,}/g, ', ')})
            slots.addComponents(
                new ButtonBuilder()
                    .setCustomId(`${index}`)
                    .setLabel(document.getElementsByClassName('pi-item pi-header pi-secondary-font pi-item-spacing pi-secondary-background')[index].textContent.includes('Keystone') ? 'Keystone' : document.getElementsByClassName('pi-item pi-header pi-secondary-font pi-item-spacing pi-secondary-background')[index].textContent)
                    .setStyle(ButtonStyle.Primary)
            );
            index++;
        }

        rtnEmbeds.push(embed);
        interaction.editReply({embeds: rtnEmbeds, components: [slots]});
        
        const filter = (btnInt) => {
            return interaction.user.id === btnInt.user.id;
        };

        const collector = channel.createMessageComponentCollector({
            filter,
            time: 15000,
        });

        let selectedSlot = 0;
        collector.on('collect', async (i) => {
            await i.deferUpdate();
            
            if (i.customId < 10) {
                const runeButtons = new ActionRowBuilder();
                document.getElementsByClassName(`pi-smart-group-body pi-border-color`)[i.customId].textContent.trim().replace(/\n/g, ' ').replace(/ {2,}/g, '||').split('||').map((r, ind) => {
                    runeButtons.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${10 + ind}`)
                            .setLabel(r)
                            .setStyle(ButtonStyle.Primary)
                    );
                });
                
                await interaction.editReply({components: [runeButtons]});
            } else {
                interaction.editReply({ components: []});
                interaction.override = document.getElementsByClassName(`pi-smart-group-body pi-border-color`)[selectedSlot].textContent.trim().replace(/\n/g, ' ').replace(/ {2,}/g, '||').split('||')[i.customId - 10];
                command.execute(interaction, channel);
            }
        });

        collector.on('end', async () => {
            await interaction.editReply({
                components: []
            })
        });
    } catch (error) {
        handlError(interaction, error);
        return;
    }
}

const command = {
    data: new SlashCommandBuilder()
            .setName(`${informaton.name}`)
            .setDescription(`${informaton.description}`)
            .addStringOption((option) => {
                option.setName('rune')
                      .setDescription('Rune / Rune tree Name')
                      .setRequired(true)     
                return option;
            })
    , async execute (interaction, channel) {
        if (!interaction.override)
            await interaction.deferReply();

        try {
            let ref = {isRune: true};
            let givenRune = interaction.override || interaction.options.getString('rune');
            let rune = await findRune(givenRune, ref);
            
            if (rune === undefined) {
                handlError(interaction, -2);
                return;
            } if (rune === null) {
                handleNotFound(interaction);
                return;
            }

            if (ref.isRune) 
                handleRune(interaction, rune);
            else
                handleTree(interaction, channel, rune);

        } catch (error) {
            handlError(interaction, error);
            return;
        }
    }
};

export default command;