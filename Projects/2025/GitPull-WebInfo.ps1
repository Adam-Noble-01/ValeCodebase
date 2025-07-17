# 1. Create a folder and initialise Git
mkdir 25-Projects
cd 25-Projects
git init

# 2. Add the remote repo
git remote add origin https://github.com/Adam-Noble-01/WE10_--_Public-Repo_--_Live-Website.git

# 3. Enable sparse checkout
git config core.sparseCheckout true

# 4. Define the folder path to checkout
echo "na-project-portal/25-Projects/" > .git/info/sparse-checkout

# 5. Pull only the required folder
git pull origin main
