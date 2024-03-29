# Generated by Django 4.1.6 on 2023-02-13 13:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_sharednote_share_note_to_user_once'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sharednote',
            name='content',
            field=models.JSONField(blank=True, default=None, help_text='Users can edit shared notes, but note directly on the main notes app', null=True),
        ),
    ]
