const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const { verificationChannel, trainerRole, tinkertankerRole, pmCategory } = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Lets an admin verify you.")
    .addStringOption((option) =>
      option.setName("name").setDescription("Your full name").setRequired(true)
    ),
  async execute(interaction) {
    const client = interaction.client;
    const newUser = interaction.user;
    const newName = interaction.options.getString("name");
    const vChannel = client.channels.cache.get(verificationChannel);
    const { guild } = interaction;
    const { ViewChannel, ReadMessageHistory, SendMessages } = PermissionFlagsBits;
    
    var unique = await vChannel.send({
      content: `${newUser} joined.`,
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${newName} has just joined the server. Choose the appropriate role or reject them.`
          ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("trainer")
            .setLabel("Trainer")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("tinkertanker")
            .setLabel("Tinkertanker")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("reject")
            .setLabel("Reject")
            .setStyle(ButtonStyle.Danger)
        ),
      ],
    });

    const collector = unique.createMessageComponentCollector({ time: 604800000, });
    collector.on('collect', async interaction => {
      async function giveRole(role) {
        const newUser = interaction.message.mentions.users.first();
        newMember = await guild.members.fetch(newUser.id); 
        //Set Nickname
        await newMember.setNickname(newName).catch((err) => {
          console.log(err);
          console.log("Could not set nickname!");
        });
        //Give user role
        roleString = "";
        if(role == trainerRole) roleString = "Trainer";
        else if(role == tinkertankerRole) roleString = "Tinkertanker";
        await newMember.roles
          .add(role)
          .catch((err) => {
            console.log(err);
            return interaction.reply({
              content: "Could not set user role!",
            });
          });
        //Inform user
        await newUser.send("You are now verified");
        //Create a personal channel
        channelName = newName.replace(" ", "-").toLowerCase();
        while((interaction.guild.channels.cache.find(c => c.name.toLowerCase() === channelName))) {
          channelName += '-';
          channelName += (Math.random() + 1).toString(36).substring(7);
        }

        var categoryName = "private-messages";
        var parentCategory = await interaction.guild.channels.cache.find((cat) => (cat.name === categoryName));
        while(true){
          parentCategory = await interaction.guild.channels.cache.find((cat) => (cat.name === categoryName)); 
          try {
            if(parentCategory.children.cache.size >= 45) categoryName += "-";
            else break;
          } catch(err){
            parentCategory = await interaction.guild.channels.create({ name: categoryName, type: ChannelType.GuildCategory });
            break;
          }
        }

        await interaction.guild.channels
          .create({
            name: `${channelName}`,
            type: ChannelType.GuildText,
            parent: parentCategory,
            permissionOverwrites: [
              {
                id: newUser.id,
                allow: [ViewChannel, SendMessages, ReadMessageHistory],
              },
              {
                id: guild.roles.everyone.id,
                deny: [ViewChannel],
              },
            ],
          })
          .then((channel) => {
            channel.send(`Welcome to your channel ${newName}!`)
          })
          .then(() =>
            interaction.update({
              components: [],
            })
          )
          .then(() => {
            const userTag = interaction.message.mentions.users.first();
            const channelTag = interaction.guild.channels.cache.find(channel => channel.name === channelName).toString()
            vChannel.send(`${userTag} is now verified with ${roleString} role and channel ${channelTag} has been created`);
          })
          .catch((err) => {
            console.log(err);
            return interaction.reply({
              content: "Could not create channel!",
            });
          });
      }

      if (interaction.isButton()) {
        if (interaction.customId == "trainer") {
          giveRole(trainerRole);
        } else if (interaction.customId == "tinkertanker") {
          giveRole(tinkertankerRole);
        } else {
          //To admins
          interaction.reply({
            content: "User was rejected.",
          });
          //To user
          interaction.user.send("Try again, or contact an admin.");
        }
      }
    });
    //User side
    return interaction.reply({
      content: `Wait for a while, we are verifying you`,
      ephemeral: true,
    });
  },
};