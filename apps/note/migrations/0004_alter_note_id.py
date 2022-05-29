# Generated by Django 3.2.13 on 2022-05-29 11:02

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('note', '0003_auto_20220529_0746'),
    ]

    operations = [
        migrations.AlterField(
            model_name='note',
            name='id',
            field=models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False, unique=True),
        ),
    ]
