# Generated by Django 3.2.13 on 2022-07-06 23:45

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import libs.mixins.model
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Note',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=60)),
                ('body', models.JSONField()),
                ('private', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_edited', models.DateTimeField()),
                ('archived', models.BooleanField(default=False)),
                ('slug', models.SlugField()),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            bases=(models.Model, libs.mixins.model.ModelMixin),
        ),
        migrations.AddConstraint(
            model_name='note',
            constraint=models.UniqueConstraint(fields=('slug', 'author'), name='user_cant_have_dup_slugs'),
        ),
    ]
