# Generated by Django 4.1.1 on 2022-10-15 03:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0003_rename_date_shared_shared_date_created_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='note',
            name='slug',
            field=models.SlugField(null=True),
        ),
        migrations.AddConstraint(
            model_name='note',
            constraint=models.UniqueConstraint(fields=('slug', 'is_deleted', 'author'), name='unique_slug_per_user_note'),
        ),
    ]