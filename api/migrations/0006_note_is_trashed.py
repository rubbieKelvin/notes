# Generated by Django 4.1.5 on 2023-01-23 10:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_note_is_starred'),
    ]

    operations = [
        migrations.AddField(
            model_name='note',
            name='is_trashed',
            field=models.BooleanField(default=False),
        ),
    ]
