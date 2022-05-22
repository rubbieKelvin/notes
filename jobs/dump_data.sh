# remove the dumps folder if it exists
if [[ -d dumps ]]; then
    rm -r dumps
fi

# create the dumps folder again and move to apps
mkdir dumps
cd apps

# for all items in the apps folder,
# dump all the data from all non magic packages
for item in *; do
    if [[ -d "$item" ]]; then
        if [[ ! "$item" = \__* ]]; then
            python ../manage.py dumpdata "$item" --indent 2 > \
                "../dumps/$item.json"
        fi
    fi
done

# go back
cd ..
